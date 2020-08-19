'use strict'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()
const env = process.env.NODE_ENV || 'development'

const rootDir = path.resolve(__dirname, '../..')

const csUrlApi = `${process.env.CS_PROTOCOL}://${process.env.CS_HOST}:${process.env.CS_PORT}/api/${process.env.CS_COLLECTION}`

const configs = {
  base: {
    host: process.env.APP_HOST || 'localhost',
    port: process.env.APP_PORT || 8080,
    root: rootDir,
    logger: {
      fileName: process.env.LOG_FILENAME || 'RenderAdapter',
      directory: process.env.LOG_DIRECTORY || 'logs',
      level: process.env.LOG_LEVEL || 'info'
    },
    filePath: {
      downloadFolder: process.env.DOWNLOAD_FOLDER || 'downloads'
    },
    orc: {
      protocol: process.env.ORC_PROTOCOL || 'http',
      host: process.env.ORC_HOST || 'localhost',
      port: process.env.ORC_PORT || '80'
    },
    cloudStorage: {
      protocol: process.env.CS_PROTOCOL || 'http',
      host: process.env.CS_HOST || 'localhost',
      port: process.env.CS_PORT || 5000,
      collection: process.env.CS_COLLECTION || 'sn',
      timeout: process.env.TIMEOUT || 5000
    },
    cloudStorageApi: {
      collection: process.env.CS_COLLECTION || 'sn',
      expireTime: process.env.UPLOAD_EXPIRE_TIME || 720,
      expireUrl: `${csUrlApi}/fileExpire`,
      upload: `${csUrlApi}/upload`,
      download: `${csUrlApi}/download`,
      checkExist: `${csUrlApi}/files/exist`
    },
    retryTimes: process.env.RETRY_TIMES || 2,
    retryDelay: process.env.RETRY_DELAY || 1000
  },
  production: {
  },
  development: {
  },
  test: {
  }
}
const config = Object.assign(configs.base, configs[env])

export default config
