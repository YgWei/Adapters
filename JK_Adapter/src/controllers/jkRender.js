import JKServices from '../services/jkServices'
import * as err from '../constants/error'
import logger from '../logger/system'
import fs from 'fs-extra'

/**
 * @swagger
 * /jkdjk/ftp:
 *    post:
*      summary: JK_DJK XMl File Preprocess To Json File
 *      description: Preprocessing XML File to Json File
 *      tags:
 *        - JKDJK
 *      produces:
 *        - application/json
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                xmlFileName:
 *                  type: string
 *                  example: JKNH-KYSQ-ZGQRH-2019A1_00000250_1.xml
 *      responses:
 *        200:
 *          description: Success process xml to json and start render workflow.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: string
 *                    example: success
 *                  file:
 *                    type: string
 *                    example: JKNH-KYSQ-ZGQRH-2019A1_00000201_3.xml
 *                  message:
 *                    type: string
 *                    example: jk files start render
 *        403:
 *          description: file from ftp fail or file content validate fail
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  code:
 *                    type: string
 *                    example: XML_TOJSON_VALIDATE_FAIL
 *                  message:
 *                    type: string
 *                    example: xml file process fail
 */
export const startFromFTP = async function (req, res, next) {
  const jkService = new JKServices()
  try {
    const body = req.body
    const origin = req.headers.origin
    let ftpDownloadResult
    logger.info('start download Jk file from FTP')
    const fileNames = [body.xmlFileName]
    try {
      ftpDownloadResult = await jkService.downloadFTPFiles(fileNames)
    } catch (error) {
      const errorBody = new Error(err.FTP_SERVICE_EXCEPTION.message)
      errorBody.status = 500
      errorBody.code = err.FTP_SERVICE_EXCEPTION.code
      errorBody.errorMsg = error
      throw errorBody
    }
    if (ftpDownloadResult.result === false) {
      // -- 移除下載的檔案 --
      logger.error(`Download FTP file fail， end preprocess workflow: ${ftpDownloadResult.cause}`)
      if (ftpDownloadResult.download) {
        for (const removePath of ftpDownloadResult.download) {
          try { await fs.remove(removePath) } catch (error) { logger.error(error) }
        }
      }
      const errorBody = new Error(err.FTP_SERVICE_FAIL.message)
      errorBody.status = 403
      errorBody.code = err.FTP_SERVICE_FAIL.code
      errorBody.errorCause = ftpDownloadResult.cause
      throw errorBody
    }
    logger.info('download file from FTP done')
    let validateResult
    logger.info('start conversion xml to json，feat xml content validate')
    try {
      validateResult = await jkService.xmlToJsonWithValidate(ftpDownloadResult.download)
    } catch (error) {
      const errorBody = new Error(err.XML_TOJSON_VALIDATE_EXCEPTION.message)
      errorBody.status = 500
      errorBody.code = err.XML_TOJSON_VALIDATE_EXCEPTION.code
      errorBody.errorMsg = error
      throw errorBody
    }
    if (validateResult.result === false) {
      // -- 移除下載的檔案 --
      logger.info('xml content validate fail')
      if (ftpDownloadResult.download) {
        for (const removePath of ftpDownloadResult.download) {
          try { await fs.remove(removePath) } catch (error) { logger.error(error) }
        }
      }
      const errorBody = new Error(err.XML_TOJSON_VALIDATE_FAIL.message)
      errorBody.status = 403
      errorBody.code = err.XML_TOJSON_VALIDATE_FAIL.code
      errorBody.errorCause = validateResult.cause
      throw errorBody
    }
    logger.info('xml content validate pass and conversion to json success ，done')
    logger.info('start save json object to local .json file')
    const saveResult = await jkService.saveJsonToLocal(validateResult.Jsons)
    if (saveResult.result === false) {
      logger.info('save json object to local .json file fail')
      for (const removePath of ftpDownloadResult.download) {
        try { await fs.remove(removePath) } catch (error) { logger.error(error) }
      }
      for (const removePath of saveResult.savePaths) {
        try { await fs.remove(removePath) } catch (error) { logger.error(error) }
      }
      const errorBody = new Error(err.SAVE_JSONFILE_EXCEPTION.message)
      errorBody.status = 500
      errorBody.code = err.SAVE_JSONFILE_EXCEPTION.code
      throw errorBody
    }
    logger.info('save json object to local .json file done')
    logger.info('start upload json file and xml file to Cloud Storage')
    for (const expose of saveResult.exposeData) {
      const uploadResult = await jkService.uploadToCloudStorage(expose)
      if (uploadResult.result === false) {
        jkService.removeAllTempFiles(saveResult.exposeData)
        logger.info('call cloud service fail')
        const errorBody = new Error(err.CLOUD_SERVER_FAIL.message)
        errorBody.status = 500
        errorBody.code = err.CLOUD_SERVER_FAIL.code
        throw errorBody
      }
      await jkService.setCloudFileExpireTime(uploadResult.response)
      logger.info('success on uploading json file and xml file to Cloud Storage')

      const sendToMQResult = await jkService.sendRequestToORC({ uploadResult, content: expose.content, filePath: expose.jsonPath }, origin)
      if (sendToMQResult.result === false) {
        jkService.removeAllTempFiles(saveResult.exposeData)
        logger.info('send Request to ORC fail')
        const errorBody = new Error(err.ORC_REQUEST.message)
        errorBody.status = 500
        errorBody.code = err.ORC_REQUEST.code
        throw errorBody
      }
    }
    jkService.removeAllTempFiles(saveResult.exposeData)
    res.status(200).json({
      status: 'Success',
      data: { file: body.xmlFileName },
      message: 'jk files start render'
    })
  } catch (err) {
    if (err.errorMsg) {
      logger.error(err.errorMsg)
    }
    res.status(err.status).json({
      status: 'Fail',
      code: err.code,
      message: err.message,
      cause: err.errorCause
    })
  }
}
