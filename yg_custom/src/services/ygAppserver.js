import request from 'request-promise'
import config from '../config'

export const getCustomFiles = async (businessCode) => {
  // const uri = `${config.ygAppserver.protocol}://${config.ygAppserver.host}:${config.ygAppserver.port}`

  // const options = {
  //   method: 'GET',
  //   uri: `${uri}/api/tasks/policy/${businessCode}`,
  //   json: true
  // }

  // try {
  //   const result = await request(options)
  //   const files = result.data.files
  //   return files
  // } catch (err) {
  //   throw new Error(`Appserver Request Fail,Cause : ${err.message}`)
  // }

  const files = [
    {
      fileuuid: "5f0fc0a33ce4a200178e106e",
      filename: "public3_01.jpg",
      type: "page1",
      md5: "e3913a4430bdeb7cc164fb6b93037589"
    },
    {
      fileuuid: "5f0fc0a33ce4a200178e107e",
      filename: "public3_02.jpg",
      type: "page2",
      md5: "195851ce64a2600de1aa6e2e69b905b6"
    },
    {
      fileuuid: "5f0fc0a33ce4a200178e1088",
      filename: "public3_03.jpg",
      type: "page3",
      md5: "900b081209b70f8184424554507c3644"
    },
    {
      fileuuid: "5f0fc0a43ce4a200178e1091",
      filename: "public3_04.jpg",
      type: "page4",
      md5: "abdb0ee88c34027aa514f356b2d7951f"
    },
    {
      fileuuid: "5f0fc0a43ce4a200178e1097",
      filename: "public3_07.jpg",
      md5: "6212be70affe2ccc05b7db305526d586",
      type: "page7"
    },
    {
      fileuuid: "5f0fc0a43ce4a200178e10b6",
      filename: "public3_08.jpg",
      md5: "82c3db394360b482e426fedbaff3b755",
      type: "page8"
    }
  ]

  return files
}
