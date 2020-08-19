import fs from 'fs-extra'
import _ from 'lodash'
import xmlCovert from 'xml-js'

/**
 * [getRenderYgInsuranceData 陽光保單取得xml裡面相關資訊
 * @type {[xmlFilePath]} : 陽光保單xml檔案路徑
 */
export const getRenderYgInsuranceData = async function (xmlFilePath, batch) {
  const xmlData = await fs.readFile(xmlFilePath, 'utf-8')
  const options = {
    compact: true
  }

  const covertResult = await xmlCovert.xml2js(xmlData, options)
  const policyInfo = covertResult.policyList.policies.policy
  const insuranceContent = {
    'company': 'yg',
    'insurance': 'custom',
    'workcenterCode': batch.workcenterCode,
    'businessCode': policyInfo.policyNo._text,
    'policyNumber': policyInfo.proposalNo._text,
    'barcode': batch.barcode,
    'type': policyInfo.channel._text,
    'riskCode': '',
    'template': policyInfo.templateName._text
  }
  return insuranceContent
}

export const getPages = async function (targetFilePath) {
  targetFilePath.file = targetFilePath.file.replace('_bill.xml', '.xml')
  const content = await fs.readFile(`${targetFilePath.dir}/${targetFilePath.name}/${targetFilePath.file}`, 'utf8')
  const options = {
    compact: true
  }

  const result = await xmlCovert.xml2js(content, options)
  const newData = {
    insurancePolicyPage: [],
    policyPage: []
  }

  result.paperTray.row.forEach(row => {
    if (row.printContent._text === '保单页') {
      newData.policyPage.push(parseInt(row.startPage._text))
    }
    else if (row.printContent._text === '投保书') {
      for (let i = row.startPage._text; i <= row.endPage._text; i++) {
        newData.insurancePolicyPage.push(parseInt(i))
      }
    }
  })
  return newData
}

export const getFolderList = async function (folderPath) {
  try {
    const fileNames = await fs.readdir(folderPath)
    return fileNames
  } catch (err) {
    throw new Error(`Fail on listing ${folderPath} => ${err}`)
  }
}
