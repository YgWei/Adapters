import config from '../config'
import request from 'request-promise'
import logger from '../logger/system'
import _ from 'lodash'

export default class ygServices {
  async sendRequestToORC(info, origin, pages, uploadZipFileUUID, uploadFilesUUID, other = {}) {
    const endFilesPage = uploadFilesUUID.splice(-2)
    const startFilesPage = uploadFilesUUID
    const insurancePolicyContent = pages.insurancePolicyPage.map(page => {
      return {
        page: page,
        scale: 0.98
      }
    })
    const PolicyContent = pages.policyPage.map(page => {
      return {
        text: "%YYYY年%MM月%DD日",
        page: page,
        position: {
          x: 427,
          y: 734
        },
        config: {
          size: 10,
          bold: true
        }
      }
    })

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
        origin: origin,
        renderRequest: {
          sourceID: uploadZipFileUUID[0], //source file's id
          renderFlow: 'SN_Custom',
          taskParam: {
            PdfProcess: {
              process: [
                {
                  source: uploadZipFileUUID[0], // same as sourceID
                  type: "scale",
                  contents: insurancePolicyContent
                },
                {
                  type: "insertText",
                  contents: PolicyContent
                }
              ]
            },
            PdfMerge: {
              sources: [startFilesPage, "<PdfProcess.result.mainFile>", endFilesPage].flat(1),
              accSource: "<$1.result.mainFile>"
            }
          }
        },
        extraInfo: {
          company: "yg",
          insurance: info.insurance,
          businessCode: info.businessCode,
          policyNumber: info.policyNumber,
          barcode: info.barcode,
          workcenterCode: info.workcenterCode,
        }
      },
      json: true
    }
    try {
      const result = await request(options)
      logger.info('Sending request to orc success.')
      return result
    } catch (err) {
      throw new Error(`Sending request to ORC fail! => ${err.message}`)
    }
  }
}
