import Joi from '@hapi/joi'

export const snRequestBodyValidate = {
  body: Joi.object({
    applyBarCode: Joi.string().required(),
    cover: Joi.array().min(1).items(
      Joi.object({
        fileUUID: Joi.string().required(),
        type: Joi.string().required()
      })
    ),
    policyNumber: Joi.string().required()
  })
}
