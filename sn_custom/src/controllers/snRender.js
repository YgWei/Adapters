import SNServices from '../services/snServices'
import CloudService from '../services/cloudService'
import logger from '../logger/system'
import config from '../config'
import * as customerErr from '../constants/error'
import _ from 'lodash'
import fs from 'fs-extra'

const downloadDir = config.filePath.downloadFolder

/**
 * @swagger
 * /sn/custom:
 *    post:
 *      summary: SN receive data and validate
 *      description: Receive data and validate it for SN
 *      tags:
 *        - SN
 *      produces:
 *        - application/json
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                applyBarCode:
 *                  type: string
 *                  example: 9999
 *                cover:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      fileUUID:
 *                        type: string
 *                        example: 123
 *                      type:
 *                        type: string
 *                        example: page1
 *                policyNumber:
 *                  type: string
 *                  example: 1234
 *      responses:
 *        200:
 *          description: success start sn render workflow.
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
 *          description: parameter error.
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
 *                    example: INVALID_REQUEST
 *                  message:
 *                    type: string
 *                    example: parameter error, please verify your parameters
 *        500:
 *          description: internal error.
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
 *                    example: INTERNAL_SERVER_ERROR
 *                  message:
 *                    type: string
 *                    example: internal error, please contact system administrator
 *              example:
 *                status: fail
 *                code: INTERNAL_SERVER_ERROR
 *                message: internal error, please contact system administrator
 */
export const preprocessSN = async function (req, res, next) {
  const cloudService = new CloudService()
  const snServices = new SNServices()
  const body = req.body
  const origin = req.headers.origin
  const applyBarCode = body.applyBarCode
  const policyNumber = body.policyNumber
  try {
    const originalCoverArray = body.cover
    const coverArray = sortCover(originalCoverArray)

    // -- 確認檔案是否存在 --
    const cloudFiles = getFileUUIDs(coverArray)

    await cloudService.fileIsExist(cloudFiles)

    // -- 下載圖片 --
    logger.info('start to download the image files')
    const downloadImages = generateDownloadArray(coverArray, applyBarCode)
    const downloadimagesResult = await cloudService.retryDownloadImages(downloadImages, { dir: downloadDir, base: applyBarCode })
    logger.info('download image files succeed')

    const fileNameArray = generateFileNameArray(coverArray, applyBarCode)

    const uploadsArray = []
    for (let fileName of fileNameArray) {
      uploadsArray.push(`${downloadDir}/${applyBarCode}/${fileName}`)
    }
    logger.info('start upload image files')
    const uploadResult = await cloudService.retryUpload(uploadsArray)
    logger.info('Upload images to Cloud Storage succeeded')

    const uploadFilesUUID = uploadResult.response.map(function (response) { return response._id })
    await cloudService.setFileExpireHR(uploadFilesUUID)

    // -- 發送ORC --
    await snServices.sendMessage(applyBarCode, policyNumber, origin, uploadFilesUUID)


    res.status(200).json({
      status: 'Success',
      message: 'render task start'
    })
  } catch (err) {
    logger.error(err.message)
    res.status(500).json({
      status: 'Fail',
      code: customerErr.INTERNAL_ERROR.code,
      message: err.message
    })
  } finally {
    if (fs.existsSync(`${downloadDir}/${applyBarCode}`)) {
      try {
        logger.info('delete reference file')
        await fs.remove(`${downloadDir}/${applyBarCode}`)
      } catch (error) {
        logger.error(`delete files err ${error}`)
      }
    }
  }
}

function sortCover(cover = []) {
  const coverArray = _.sortBy(cover, (image) => {
    return image.type
  })
  return coverArray
}

function generateDownloadArray(coverArray, applyBarCode) {
  const downloadImages = coverArray.map((file) => {
    return {
      fileuuid: file.fileUUID,
      filename: `${applyBarCode}-${file.type}.jpg`
    }
  })
  return downloadImages
}

function generateFileNameArray(coverArray, applyBarCode) {
  const fileNameArray = coverArray.map((file) => {
    return `${applyBarCode}-${file.type}.jpg`
  })
  return fileNameArray
}

function getFileUUIDs(coverArray) {
  const uuids = coverArray.map((cover) => {
    return cover.fileUUID
  })
  return uuids
}
