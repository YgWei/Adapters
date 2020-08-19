'use strict'
import YGServices from '../services/ygServices'
import config from '../config'
import logger from '../logger/system'
import * as fileService from '../services/fileServices'
import FtpServices from '../services/ftpServices'
import fs from 'fs-extra'
import pathTool from 'path'
import _ from 'lodash'
import * as customerErr from '../constants/error'
import * as ygAppserver from '../services/ygAppserver'
import CloudService from '../services/cloudServices'
import AdmZip from 'adm-zip'

const downloadDir = config.filePath.downloadFolder

/**
 * @swagger
 * /yg/custom/ftp:
 *    post:
 *      summary: sunlight receive data and validate
 *      description: Receive data and validate it for Sunlight(YG)
 *      tags:
 *        - YG
 *      produces:
 *        - application/json
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                company:
 *                  type: string
 *                  example: YangGuang
 *                batch:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      barcode:
 *                        type: string
 *                        example: e0ad134cddd7dd5b2b707a3be1bf48f9
 *                      workcenterCode:
 *                        type: string
 *                        example: 01BJ
 *      responses:
 *        200:
 *          description: success start yg render workflow.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: string
 *                    example: success
 *                  message:
 *                    type: string
 *                    example: render task start
 *        400:
 *          description: ftp server fail or ftp file not found.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: string
 *                    example: fail
 *                  code:
 *                    type: string
 *                    example: BARCODE_NOT_CORRECT
 *                  message:
 *                    type: string
 *                    example: barcode is wrong, please check
 */
export const fromFtp = async function (req, res, next) {
  const cloudService = new CloudService()
  const ygServices = new YGServices()
  const ftpServices = new FtpServices()

  const body = req.body
  const batch = body.batch
  const origin = req.headers.origin

  const zipFilesName = []
  const barcodeFilesName = batch.map(function (batchItem) {
    zipFilesName.push(`${batchItem.barcode}.zip`)
    batchItem.fileName = `${batchItem.barcode}.zip`
    return batchItem
  })
  logger.info(`start download ftp files ${JSON.stringify(zipFilesName)}`)
  try {
    await ftpServices.downLoadFileToLocal(zipFilesName)
  } catch (err) {
    // --- ftp download fail --
    logger.error(`Download FTP file fail => ${err.message}`)
    if (err.download) {
      for (const removePath of err.download) {
        try { await fs.remove(removePath) } catch (error) { logger.error(error) }
      }
    }
    res.status(500).json({
      status: 'Fail',
      code: customerErr.FTP_SERVICE_FAIL.code,
      message: `${customerErr.FTP_SERVICE_FAIL.message} => ${err.message}`
    })
    return
  }
  logger.info(`done download ftp files ${JSON.stringify(zipFilesName)}`)

  try {
    // -- 拆分資料 --
    for (let barcodeFile of barcodeFilesName) {
      const filePath = `${downloadDir}/${barcodeFile.fileName}`
      const pathParse = pathTool.parse(filePath)

      // -- 解壓縮 --
      logger.info(`extract zip files to ${pathParse.dir}/${pathParse.name}`)
      const zip = new AdmZip(`${pathParse.dir}/${pathParse.base}`)
      zip.extractAllTo(`${pathParse.dir}/${pathParse.name}/`, true) // true for overwrite

      const folderList = await fileService.getFolderList(`${pathParse.dir}/${pathParse.name}`) // get all files in extracted dir
      const xmlFilePath = folderList.find(function (paths) {
        return paths.endsWith('bill.xml')
      })
      if (!xmlFilePath) {
        throw new Error('cannot find bill.xml file，please check zip or create zip method')
      }

      logger.info('get yg insurance data from xml')
      const xmlData = await fileService.getRenderYgInsuranceData(`${pathParse.dir}/${pathParse.name}/${xmlFilePath}`, barcodeFile)

      // -- get image files array --
      const fileArray = await ygAppserver.getCustomFiles(xmlData.policyNumber)

      const fileSortArray = _.sortBy(fileArray, function (image) {
        return image.type
      })
      const downloadImages = []
      const cloudFiles = fileSortArray.map(function (file) {
        const name = pathTool.parse(file.filename)
        const ygImage = {
          fileuuid: file.fileuuid,
          filename: `${file.type}${name.ext}`
        }
        downloadImages.push(ygImage)
        return file.fileuuid
      })

      // -- check file --
      await cloudService.fileIsExist(cloudFiles)

      // --下載圖片 --
      logger.info('Starting to download image files')
      await cloudService.retryDownloadImages(downloadImages, { dir: pathParse.dir, base: `${pathParse.name}` })
      logger.info('Download from Cloud Storage succeeded')

      const uploadsArray = []

      // -- Add original zip that we download from ftp as one of the item to upload --
      uploadsArray.push(`${pathParse.dir}/${pathParse.base}`)

      // -- Add image files that we download as items to upload --
      for (let image of downloadImages) {
        uploadsArray.push(`${pathParse.dir}/${pathParse.name}/${image.filename}`)
      }

      logger.info('Starting to upload zip and image files')
      const uploadResult = await cloudService.retryUpload(uploadsArray)
      logger.info('Upload to Cloud Storage succeeded')

      const pages = await fileService.getPages({ dir: pathParse.dir, name: pathParse.name, file: `${xmlFilePath}` })

      const uploadFilesUUID = uploadResult.response.map(function (response) { return response._id })
      await cloudService.setFileExpireHR(uploadFilesUUID)

      const uploadZipFileUUID = uploadFilesUUID.slice(0, 1)
      const uploadImageFilesUUID = uploadFilesUUID.slice(1)

      const info = xmlData
      // -- 發送ORC --
      await ygServices.sendRequestToORC(info, origin, pages, uploadZipFileUUID, uploadImageFilesUUID)
    }
    res.status(200).json({
      status: 'Success',
      message: 'render task start'
    })
  } catch (err) {
    logger.error(err.message)
    res.status(500).json({
      status: 'Fail',
      code: customerErr.INTERNAL_ERROR.code,
      message: err.message || customerErr.INTERNAL_ERROR.message,
    })
  } finally {
    // -- delete reference file
    logger.info('delete reference file')
    for (let zipFile of zipFilesName) {
      const filePath = `${downloadDir}/${zipFile}`
      const pathParse = pathTool.parse(filePath)
      try {
        await fs.remove(filePath)
        await fs.remove(`${pathParse.dir}/${pathParse.name}`)
        logger.info('delete completed')
      } catch (err) {
        logger.error(`delete files err ${err}`)
      }
    }
  }
}
