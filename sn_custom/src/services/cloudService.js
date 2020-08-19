import logger from '../logger/system'
import md5 from 'md5-promised'
import config from '../config'
import _ from 'lodash'
import download from 'image-downloader'
import path from 'path'
import fs from 'fs-extra'
import request from 'request-promise'
import delay from 'delay'

const RETRY_TIMES = config.retryTimes
const RETRY_DELAY = config.retryDelay
const TIMEOUT = config.cloudStorage.timeout
const baseUrl = `${config.cloudStorage.protocol}://${config.cloudStorage.host}:${config.cloudStorage.port}/api/`

const collection = config.cloudStorageApi.collection
const checkUrl = config.cloudStorageApi.checkExist
const downloadUrl = config.cloudStorageApi.download
const uploadUrl = config.cloudStorageApi.upload
const expireUrl = config.cloudStorageApi.expireUrl
const expireTime = config.cloudStorageApi.expireTime

export default class cloudService {
  /**
   * [fileIsExist description]
   * 確定雲端儲存是否有這些檔案，外部需要攔截連線錯誤。
   * @param  {[Array]}  uuids [檔案uuid 陣列]
   * @return {true | false}       [是否全部存在]
   */
  async fileIsExist(uuids = []) {
    logger.info('Checking if files are exist...')
    const options = {
      method: 'POST',
      url: checkUrl,
      body: {
        filesID: uuids
      },
      json: true,
      timeout: TIMEOUT
    }
    try {
      const result = await request(options)
      const haveFalse = _.find(result, function (item) {
        return item.isExist === false
      })
      if (haveFalse) {
        throw new Error(`This file is not exist: ${haveFalse._id}`)
      }
      return true
    } catch (err) {
      throw new Error(`Error when checking files exist => ${err.message}`)
    }
  }
  /**
   * [retryUpload 上傳檔案,具有重試功能]
   * @param  {Array} filesPathParse [上傳檔案路徑,
    { root: '/',
    dir: '/home/user/dir',
    base: 'file.txt',
    ext: '.txt',
    name: 'file' }]
   * @return {Promise}
   */
  async retryUpload(filesPathParse = []) {
    let currentTime = 1
    const service = this
    try {
      for (currentTime; currentTime <= RETRY_TIMES; currentTime++) {
        const result = await service.uploadFiles(filesPathParse)
        if (result.result) {
          return result
        } else {
          await delay(RETRY_DELAY)
          logger.info(`uploadFiles retry ${currentTime} times, reason => ${result.reason}`)
          if (currentTime === parseInt(RETRY_TIMES)) {
            throw new Error(result.reason)
          }
        }
      }
    } catch (err) {
      throw new Error(`UpLoad File To Cloud Storage Fail => ${err.message}`)
    }
  }
  /**
   * 設定雲端儲存檔案的過期日期
   * @param {Array} fileuuid [說明] 雲端儲存檔案的uuid
   * @return [說明] {result:true(200 成功回應)/false(失敗回應) , body: if true, response: if false}
   */
  async setFileExpireHR(fileuuid = []) {
    const options = {
      method: 'POST',
      url: expireUrl,
      body: {
        filesID: fileuuid,
        expireAfterHR: expireTime
      },
      json: true,
      resolveWithFullResponse: true
    }
    try {
      const response = await request(options)
      return { result: true, body: response.body }
    } catch (error) {
      logger.error(`Fail to set expire time on uploaded files: ${error.message}`)
    }
  }
  /**
  * [retryDownloadImages 下載圖片檔案以及確認 md5,具有重試功能]
  * @param  {Array}   [files=[]]  [ {fileuuid : uuidV4 ,filename:XXX.png} ]
  * @param  {[folder path parser]}  destination [檔案下載目的地]
  * @return {Promise}             [description]
   */
  async retryDownloadImages(files = [], destination) {
    let currentTime = 1
    const service = this
    try {
      for (currentTime; currentTime <= RETRY_TIMES; currentTime++) {
        const result = await service.downloadImages(files, destination)
        if (result.result) {
          return result
        } else {
          await delay(RETRY_DELAY)
          logger.info(`downloadImages retry ${currentTime} times, reason => ${result.reason}`)
          if (currentTime === parseInt(RETRY_TIMES)) {
            throw new Error(result.reason)
          }
        }
      }
    } catch (err) {
      throw new Error(`Download Image From Cloud Storage Fail => ${err.message}`)
    }
  }
  /**
   * [_getMd5 取得特定檔案md5編碼]
   * @param  {[String]}  uuid       [file uuid]
   * @return {Promise}            [md5 code]
   */
  async _getMd5(uuid) {
    const url = `${baseUrl}${collection}/md5/${uuid}`
    const options = {
      method: 'GET',
      url: url,
      timeout: TIMEOUT,
      json: true
    }
    try {
      const result = await request(options)
      return result.md5
    } catch (err) {
      logger.error(`error when get md5: ${err}`)
    }
  }
  /**
   * [checkMd5 確認檔案正確性]
   * @param  {[String]}  md5Code  [比對值]
   * @param  {[file path parse]}  filePath [目標檔案]
   * @return {Promise}          [description]
   */
  async _checkMd5(md5Code, filePath) {
    const targetFilePath = `${filePath.dir}/${filePath.base}`
    const fileMd5 = await md5(targetFilePath)
    return md5Code === fileMd5
  }
  /**
   * [downloadImages 下載圖片檔案以及確認 md5]
   * @param  {Array}   [files=[]]  [ {fileuuid : uuidV4 ,filename:XXX.png} ]
   * @param  {[folder path parser]}  destination [檔案下載目的地]
   * @return {Promise}             [description]
   */
  async downloadImages(files = [], destination) {
    // -- dir ensure dir;
    const fileDir = `${destination.dir}/${destination.base}`
    await fs.ensureDir(fileDir)
    const tempFile = []
    for (let file of files) {
      const filePath = `${fileDir}/${file.filename}`
      const options = {
        url: `${downloadUrl}/${file.fileuuid}`,
        dest: filePath
      }
      const cloudeMd5 = await this._getMd5(file.fileuuid)
      try {
        await download.image(options)
        tempFile.push({ filePath: filePath })
      } catch (err) {
        return { result: false, reason: `Download Images error: ${err.message}` }
      }
      // -- check md5
      const filePathParse = path.parse(filePath)
      const md5Result = await this._checkMd5(cloudeMd5, filePathParse)
      if (!md5Result) {
        // --md5 爆炸拉
        return { result: false, reason: 'md5 error' }
      }
    }
    return { result: true, filesPath: tempFile }
  }
  /**
   * [uploadFiles 上傳檔案]
   * @param  {Array}   [filesPathParse=[]] [上傳檔案路徑,
    { root: '/',
    dir: '/home/user/dir',
    base: 'file.txt',
    ext: '.txt',
    name: 'file' }]
   * @return {Promise}                [description]
   */
  async uploadFiles(filesPathParse = []) {
    let files = []
    try {
      files = await Promise.all(filesPathParse.map(async function (pathParse) {
        return fs.createReadStream(pathParse)
      }))
    } catch (err) {
      return { result: false, reason: 'files stream fail' }
    }
    const options = {
      method: 'POST',
      uri: uploadUrl,
      formData: {
        file: files
      },
      json: true
    }

    let uploadResponse
    try {
      uploadResponse = await request(options)
    } catch (err) {
      return { result: false, reason: `upload fail: ${err.message}` }
    }
    // --- check md5 ---

    let filePathMd5 = []
    for (let filePath of filesPathParse) {
      const fileMd5 = await md5(filePath)
      filePathMd5.push(fileMd5)
    }
    const uploadResponseMd5 = uploadResponse.map(res => res.md5)
    const equalMd5 = _.isEqual(filePathMd5.sort(), uploadResponseMd5.sort())
    if (!equalMd5) {
      return { result: false, reason: 'md5 check fail' }
    }

    return { result: true, response: uploadResponse }
  }
}
