/*
  TODO 尚未將fileServices.js 裡的ftp 功能搬移過來
*/

import FtpFileService from 'promise-ftp'
import fs from 'fs-extra'

export default class FtpServices {
  /**
   * @description 下載遠端檔案到本地端資料夾
   * @param {Object} connectParams [說明] ftp 連線參數 {host,port,user,password},detail:https://github.com/realtymaps/promise-ftp#readme
   * @param {String} remotePath [說明] 遠端儲存資料夾路徑
   * @param {Array} remoteFilesName [說明] 遠端儲存的檔案名稱陣列
   * @param {String} localPath [說明] 下載到本地端的資料夾路徑
   * @return [說明] {result: true/false, cause: if result is false, download: success download files path}
   */
  async downLoadFileToLocal(connectParams, remotePath, remoteFilesName = [], localPath) {
    const ftpServices = new FtpFileService()
    await fs.ensureDir(localPath)
    try {
      await ftpServices.connect(connectParams)
    } catch (error) {
      return { result: false, cause: 'ftp connection fail' }
    }
    try {
      const ftpFileList = await ftpServices.list(remotePath)
      for (const fileName of remoteFilesName) {
        const isFileExist = ftpFileList.find(function (fileItem) {
          return fileName === fileItem.name
        })
        if (!isFileExist) {
          throw new Error(`ftp remote file : ${fileName} not exist`)
        }
      }
      const successDownloadFiles = []
      try {
        for (const fileName of remoteFilesName) {
          await ftpServices.get(`${remotePath}/${fileName}`).then(function (stream) {
            return new Promise(function (resolve, reject) {
              stream.once('close', resolve)
              stream.once('error', reject)
              stream.pipe(fs.createWriteStream(`${localPath}/${fileName}`))
            })
          })
          successDownloadFiles.push(`${localPath}/${fileName}`)
        }
      } catch (error) {
        const errorBody = new Error('download ftp remote file is fail')
        errorBody.download = successDownloadFiles
        throw errorBody
      }
      return { result: true, download: successDownloadFiles }
    } catch (err) {
      return { result: false, cause: err.message, download: err.download }
    } finally {
      await ftpServices.end()
    }
  }
}
