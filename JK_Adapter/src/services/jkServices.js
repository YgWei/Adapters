import config from '../config/'
import FtpServices from './ftpServices'
import path from 'path'
import _ from 'lodash'
import fs from 'fs-extra'
import Iconv from 'iconv-lite'
import logger from '../logger/system'
import xmlCovert from 'xml2js'
import xmlToString from 'xml-js'
import CloudService from './cloudService'
import request from 'request-promise'
import Joi from '@hapi/joi'

export default class jkServices {
  /**
   * 下載FTP伺服器端檔案到本地暫存資料夾
   * @param {Array} fileNames [說明] ftp伺服器的檔案名稱，路徑默認使用 .env設定
   * @return [說明] 從Ftp下載結果， {result: true/false, cause: if result is false, download: success download files path}
   */
  async downloadFTPFiles(fileNames = []) {
    const ftpServices = new FtpServices()
    const jkTempFolder = config.folder.downloadFolder
    const connectionParams = _.cloneDeep(config.ftp)
    const remotePath = config.ftp.path
    delete connectionParams.path
    const downloadResult = await ftpServices.downLoadFileToLocal(connectionParams, remotePath, fileNames, jkTempFolder)
    return downloadResult
  }

  /**
   * 轉換xmlToJson，會驗證內容相關特徵值，並返回檢測結果與處理完的資料
   * @param {Array} filesPath [說明] xml檔案的完整路徑陣列
   * @return [說明] {result: true/false, Jsons:{xmlPath,Json,content}}
   */
  async xmlToJsonWithValidate(filesPath = []) {
    const validateJsonArray = []
    const fetchJsonArray = []
    for (const path of filesPath) {
      const fileBuffer = await fs.readFile(path)
      const decodeResult = await this._decodeToUTF8Json(fileBuffer)
      if (!decodeResult.result) {
        return { result: false, cause: decodeResult.cause }
      }
      validateJsonArray.push(decodeResult.Json)
      fetchJsonArray.push({ xmlPath: path, Json: decodeResult.Json })
    }
    const validateResult = await this._checkContent(validateJsonArray)
    const finalResult = this._fetchContent(fetchJsonArray)
    return { result: validateResult, Jsons: finalResult }
  }

  /**
   * 將json物件儲存成實體檔案，並添加jsonFilePath到後續處理需要的資料群集裡
   * @param {Array} jsonObjectArray [說明] 寫入檔案需要的資料陣列,[{xmlPath,Json,content},...]
   * @return {Array} [說明] 回傳存檔狀況 {result: true(全部成功)/false(某一檔案寫入失敗),
   *                           savePaths: 成功寫入路徑陣列,
   *                           exposeData:{xmlPath,jsonPath,content}}
   */
  async saveJsonToLocal(jsonObjectArray = []) {
    const savePath = []
    const exposeData = []
    try {
      for (const saveInfo of jsonObjectArray) {
        const pathParse = path.parse(saveInfo.xmlPath)
        await fs.writeJSON(`${pathParse.dir}/${pathParse.name}.json`, saveInfo.Json, { encoding: 'utf8' })
        savePath.push(`${pathParse.dir}/${pathParse.name}.json`)
        saveInfo.jsonPath = `${pathParse.dir}/${pathParse.name}.json`
        delete saveInfo.Json
        exposeData.push(saveInfo)
      }
    } catch (error) {
      logger.error(error)
      return { result: false, savePaths: savePath }
    }
    return { result: true, exposeData, savePaths: savePath }
  }

  /**
   * 提取使用 xml-js 轉換後的JSON物件，使用的編碼格式
   * @param {Json} jsonObject [說明] xml-js 轉換後的JSON物件
   * @return {String} [說明] 編碼格式
   */
  _fetchXmlEncode(jsonObject) {
    const encode = jsonObject._declaration._attributes.encoding
    return encode.toUpperCase()
  }

  /**
   * 將讀取的 xmlfile buffer轉換為json且為utf-8編碼，目前設定只處理輸入編碼為 utf-8,gbk
   * @param {Buffer} fileBuffer [說明] Buffer
   * @return [說明] {result: true/false, Json: result is true, cause: result is false}
   */
  async _decodeToUTF8Json(fileBuffer) {
    const xmlCovertOptions = {
      explicitArray: false
    }
    const xmlToStringOptions = {
      compact: true
    }
    const jsonObject = await xmlToString.xml2js(fileBuffer, xmlToStringOptions)
    const fetchEncode = this._fetchXmlEncode(jsonObject)
    const decoderHandler = {
      'UTF-8': async function (buffer) {
        const parseJson = await xmlCovert.parseStringPromise(buffer.toString(), xmlCovertOptions).then(function (result) {
          return result
        })
        return { result: true, Json: parseJson }
      },
      UTF8: async function (buffer) {
        const parseJson = await xmlCovert.parseStringPromise(buffer.toString(), xmlCovertOptions).then(function (result) {
          return result
        })
        return { result: true, Json: parseJson }
      },
      GBK: async function (buffer) {
        const gbk = Iconv.decode(buffer, 'GBK')
        const decodeJson = await xmlCovert.parseStringPromise(gbk.toString(), xmlCovertOptions).then(function (result) {
          return result
        })
        return { result: true, Json: decodeJson }
      }
    }
    const decodeResult = await decoderHandler[fetchEncode](fileBuffer)
    if (decodeResult.result) {
      return decodeResult
    }
    return { result: false, cause: 'file encode out of specification (utf-8,gbk)' }
  }

  /**
   * 檢查內容特定特徵值是否符合規範
   * @param {Array} jsonObjectArray [說明] 需要檢查的陣列
   * @return {Boolean} [說明] true: 通過 false: 不通過
   */
  async _checkContent(jsonObjectArray = []) {
    const schema = Joi.object({
      printtype: Joi.required(),
      version: Joi.required(),
      company: Joi.required(),
      name: Joi.required(),
      type: Joi.required()
    })
    for (const checkData of jsonObjectArray) {
      try {
        await schema.validateAsync({
          printtype: checkData.policyinfo.printtype,
          version: checkData.policyinfo.version,
          company: checkData.policyinfo.productionInfo.company,
          name: checkData.policyinfo.productionInfo.name,
          type: checkData.policyinfo.productionInfo.type
        })
      } catch {
        return false
      }
    }
    return true
  }

  /**
   * 取得並組合後續流程所需要的資料
   * @param {Array} fetchJsonArray [說明] 已建立的基本資料 item => {xmlPath,Json}
   * @return {Array} item => {xmlPath,Json,content:{printType,policyNo}}
   */
  _fetchContent(fetchJsonArray = []) {
    const fetchResult = fetchJsonArray.map(function (item) {
      const fetchBody = {
        printType: item.Json.policyinfo.printtype,
        version: item.Json.policyinfo.version,
        productionInfoCompany: item.Json.policyinfo.productionInfo.company,
        productionInfoType: item.Json.policyinfo.productionInfo.type,
        productionInfoName: item.Json.policyinfo.productionInfo.name
      }
      const margeObject = {
        ...item,
        content: fetchBody
      }
      return margeObject
    })
    return fetchResult
  }

  async sendRequestToORC(requiredData, origin) {
    const { content, uploadResult, filePath } = requiredData
    const pathParse = path.parse(filePath)

    const xmlFileID = uploadResult.response.slice(0, 1).map(function (response) { return response._id })
    const jsonFileID = uploadResult.response.slice(1).map(function (response) { return response._id })

    logger.info('Sending request to orc...')
    const uri = `${config.orc.protocol}://${config.orc.host}`
    const options = {
      method: 'POST',
      url: `${uri}`,
      headers:
      {
        'Content-Type': 'application/json'
      },
      body: {
        origin: origin, // 請求來源
        renderRequest: {
          sourceID: xmlFileID[0], // source file's id
          renderFlow: 'JKDJK_Custom',
          taskParam: {
            PtRender: {
              url: `${config.orc.renderEngineUrl}/${jsonFileID[0]}`
            },
            AccGenerator: {
              type: `JKDJK-${content.productionInfoType}-${content.printType}`
            }
          }
        },
        extraInfo: {
          company: 'jkdjk',
          printType: content.printType, // get from policyinfo.printtype
          version: content.version, // get from policyinfo.version
          productionType: content.productionInfoType, // get from policyinfo.productionInfo.type
          fileName: pathParse.name // get from xml file name
        }
      },
      json: true
    }
    try {
      const result = await request(options)
      logger.info('Sending request to orc success.')
      return result
    } catch (err) {
      logger.error('Requesting to orc failed')
      throw err
    }
  }

  /**
   * 專門給jkdjk上傳檔案到雲端使用
   * @param {Object} exposeData [說明] 物件屬性必須包含 xmlPath,jsonPath
   * @return [說明] {result: true(上傳成功)/false(上傳失敗) , response:[]}
   */
  async uploadToCloudStorage(exposeData) {
    const cloudService = new CloudService()
    const uploadPath = []
    uploadPath.push(path.parse(exposeData.xmlPath))
    uploadPath.push(path.parse(exposeData.jsonPath))
    const uploadResult = await cloudService.retryUpload(config.cloudStorageSetting.uploadUrl, uploadPath)
    return uploadResult
  }

  /**
   * 專門給jkdjk設定雲端檔案過期專用
   * @param {Array} uploadResult 上傳後的回應訊息
   * @return {Object} setExpireResult 回應格式{result:true/false, body, response}
   */
  async setCloudFileExpireTime(uploadResult = []) {
    const url = config.cloudStorageSetting.expireUrl
    const cloudService = new CloudService()
    const fileuuids = uploadResult.map(function (item) {
      return item._id
    })
    const setExpireResult = await cloudService.setFileExpireHR(url, fileuuids)
    return setExpireResult
  }

  /**
   * 專門移除jkdjk發送成功後的暫存檔案
   * @param exposeData [說明] 移除完成最後一步所有的暫存檔案
   */
  async removeAllTempFiles(exposeData = []) {
    for (const expose of exposeData) {
      try { await fs.remove(expose.xmlPath) } catch (error) { logger.error(error) }
      try { await fs.remove(expose.jsonPath) } catch (error) { logger.error(error) }
    }
  }
}
