import config from '../config'
import request from 'request-promise'
import logger from '../logger/system'

export default class snServices {
  async sendMessage(applyBarCode, policyNumber, origin, uploadFilesUUID, other = {}) {
    const threeAndFourFilesPageId = uploadFilesUUID.splice(2, 2)
    const startAndEndFilesPageId = uploadFilesUUID

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
          sourceID: '', //source file's id
          renderFlow: 'SN_Custom',
          taskParam: {
            ImRender_cover: {
              sources: startAndEndFilesPageId, // page1~2 && page5-6
              type: 'merge'
            },
            ImRender_title: {
              sources: threeAndFourFilesPageId, // page3~4
              type: 'merge'
            },
            PdfNUp: {
              sources: '<$1.result.mainFile>',
              params: {
                nup: "2x1",
                landscape: true,
                papersize: '{320mm,450mm}',
                scale: '0.956',
                outfile: `${applyBarCode}_FP.pdf` // 前綴同applyBarCode
              }
            }
          }
        },
        extraInfo: {
          company: 'sn',
          applyBarCode: applyBarCode, // request.body.applyBarCode
          businessCode: policyNumber // request.body.policyNumber
        }
      },
      json: true
    }
    try {
      const result = await request(options)
      logger.info('Sending request to orc success.')
      return result
    } catch (err) {
      throw new Error(`Sending request to ORC fail: ${err.message}`)
    }
  }
}
