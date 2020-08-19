import Joi from '@hapi/joi'

export const jkFTPPostBodyValidate = {
  body: Joi.object({
    xmlFileName: Joi.string().required()
  })
}
