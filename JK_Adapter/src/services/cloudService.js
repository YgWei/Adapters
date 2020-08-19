import logger from '../logger/system'
import md5 from 'md5-promised'
import config from '../config'
import _ from 'lodash'
import fs from 'fs-extra'
import request from 'request-promise'
import delay from 'delay'

const RETRY_TIMES = config.retryTimes
const RETRY_DELAY = config.retryDelay

export default class cloudService {
  /**
   * [retryUpload 上傳檔案,具有重試功能]
   * @param  {[type]} url [上傳服務位址]
   * @param  {Array} filesPathParse [上傳檔案路徑,
   { root: '/',
   dir: '/home/user/dir',
   base: 'file.txt',
   ext: '.txt',
   name: 'file' }]
   * @return {Promise}
   */
  async retryUpload(url, filesPathParse = []) {
    let currentTime = 0
    const service = this
    async function run() {
      try {
        const result = await service.uploadFiles(url, filesPathParse)
        if (result.result) {
          return result
        }
        ++currentTime
        if (currentTime <= RETRY_TIMES) {
          logger.info(`uploadFiles retry ${currentTime} times,reason:${result.reason}`)
          await delay(RETRY_DELAY)
          return await run()
        } else {
          return { result: false }
        }
      } catch (err) {
        ++currentTime
        logger.info(`uploadFiles retry ${currentTime} times`)
        if (currentTime <= RETRY_TIMES) {
          await delay(RETRY_DELAY)
          return await run()
        } else {
          return { result: false }
        }
      }
    }
    return run()
  }

  /**
   * 設定雲端儲存檔案的過期日期
   * @param {String} url 雲端服務提供設定時效的 url
   * @param {Array} fileuuid [說明] 雲端儲存檔案的uuid
   * @param {Number} hours [說明] 過期時數，預設720 hours，30天
   * @return [說明] {result:true(200 成功回應)/false(失敗回應) , body: if true, response: if false}
   */
  async setFileExpireHR(url, fileuuid = [], hours = 720) {
    const options = {
      method: 'POST',
      url: url,
      body: {
        filesID: fileuuid,
        expireAfterHR: hours
      },
      json: true,
      resolveWithFullResponse: true
    }
    try {
      const requestResult = await request(options).then(function (response) {
        if (response.statusCode === 200) {
          return { result: true, body: response.body }
        }
        return { result: false, response }
      })
      return requestResult
    } catch (error) {
      logger.error(error)
      return { result: false }
    }
  }

  /**
   * [uploadFiles 上傳檔案]
   * @param  {[type]}  url            [上傳服務位址]
   * @param  {Array}   [filesPathParse=[]] [上傳檔案路徑,
    { root: '/',
    dir: '/home/user/dir',
    base: 'file.txt',
    ext: '.txt',
    name: 'file' }]
   * @return {Promise}                [description]
   */
  async uploadFiles(url, filesPathParse = []) {
    let files = []
    try {
      files = await Promise.all(filesPathParse.map(async function (pathParse) {
        const filePath = `${pathParse.dir}/${pathParse.base}`
        return fs.createReadStream(filePath)
      }))
    } catch (err) {
      logger.error('files stream fail : ', err)
      throw err
    }
    const options = {
      method: 'POST',
      uri: url,
      formData: {
        file: files
      }
    }
    let uploadResponse
    try {
      uploadResponse = await request(options)
    } catch {
      uploadResponse = { result: false }
    }

    // --- check md5 ---
    const uploadResponseJson = JSON.parse(uploadResponse)
    for (const filePath of filesPathParse) {
      const targetFilePath = `${filePath.dir}/${filePath.base}`
      const fileMd5 = await md5(targetFilePath)
      const md5IsExist = _.find(uploadResponseJson, function (item) {
        return item.md5 === fileMd5
      })
      if (!md5IsExist) {
        return { result: false, reason: 'md5 check fail' }
      }
    }
    return { result: true, response: uploadResponseJson }
  }
}
