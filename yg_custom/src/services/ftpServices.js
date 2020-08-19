/*
  TODO 尚未將fileServices.js 裡的ftp 功能搬移過來
*/

import FtpFileService from 'promise-ftp'
import fs from 'fs-extra'
import config from '../config'
import _ from 'lodash'

export default class FtpServices {
  /**
   * @description 下載遠端檔案到本地端資料夾
   * @param {Array} remoteFilesName [說明] 遠端儲存的檔案名稱陣列
   * @return [說明] {result: true/false, cause: if result is false, download: success download files path}
   */
  async downLoadFileToLocal(remoteFilesName = []) {
    const ftpServices = new FtpFileService()

    const downloadFolder = config.filePath.downloadFolder
    const connectionParams = _.cloneDeep(config.ftp)
    const remotePath = config.ftp.path
    delete connectionParams.path

    await fs.ensureDir(downloadFolder)
    try {
      await ftpServices.connect(connectionParams)
    } catch (error) {
      throw new Error(`Fail connecting to ftp: ${error.message}`)
    }
    try {
      const ftpFileList = await ftpServices.list(remotePath)
      for (const fileName of remoteFilesName) {
        const isFileExist = ftpFileList.find(function (fileItem) {
          return fileName === fileItem.name
        })
        if (!isFileExist) {
          throw new Error(`ftp remote files are not exist: ${fileName} not exist`)
        }
      }
      const successDownloadFiles = []
      try {
        for (const fileName of remoteFilesName) {
          await ftpServices.get(`${remotePath}/${fileName}`).then(function (stream) {
            return new Promise(function (resolve, reject) {
              stream.once('close', resolve)
              stream.once('error', reject)
              stream.pipe(fs.createWriteStream(`${downloadFolder}/${fileName}`))
            })
          })
          successDownloadFiles.push(`${downloadFolder}/${fileName}`)
        }
      } catch (error) {
        const errorBody = new Error(`${error.message}`)
        errorBody.download = successDownloadFiles
        throw errorBody
      }
      return { download: successDownloadFiles }
    } catch (err) {
      const errorBody = new Error(err.message)
      errorBody.download = err.download
      throw errorBody
    } finally {
      await ftpServices.end()
    }
  }
}
