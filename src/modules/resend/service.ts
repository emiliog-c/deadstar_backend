import { 
  AbstractNotificationProviderService,
} from "@medusajs/framework/utils"
import { 
  Logger,
} from "@medusajs/framework/types"
import { 
  Resend,
} from "resend"
import { 
  // other imports...
  MedusaError,
} from "@medusajs/framework/utils"
import { 
  // ...
  ProviderSendNotificationDTO, 
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { 
  // ...
  CreateEmailOptions, 
} from "resend"
import { orderPlacedEmail } from "./emails/order-placed"
import { userInvitedEmail } from "./emails/user-invited"

enum Templates {
  ORDER_PLACED = "order-placed",
  USER_INVITED = "user-invited",
}

const templates: {[key in Templates]?: (props: unknown) => React.ReactNode} = {
    [Templates.ORDER_PLACED]: orderPlacedEmail,
    [Templates.USER_INVITED]: userInvitedEmail,
}


type ResendOptions = {
    api_key: string
    from: string
    html_templates?: Record<string, {
        subject?: string
        content: string
    }>
}

type InjectedDependencies = {
    logger: Logger
}


class ResendNotificationProviderService extends AbstractNotificationProviderService {
    static identifier = "notification-resend"
    private resendClient: Resend
    private options: ResendOptions
    private logger: Logger

    constructor(
    { logger }: InjectedDependencies, 
    options: ResendOptions
    ) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
    }
    static validateOptions(options: Record<any, any>) {
        if (!options.api_key) {
        throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Option `api_key` is required in the provider's options."
        )
        }
        if (!options.from) {
        throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Option `from` is required in the provider's options."
        )
    }
    }
    getTemplate(template: Templates) {
        if (this.options.html_templates?.[template]) {
        return this.options.html_templates[template].content
        }
        const allowedTemplates = Object.keys(templates)

        if (!allowedTemplates.includes(template)) {
        return null
    }
    return templates[template]
    }

    getTemplateSubject(template: Templates) {
        if (this.options.html_templates?.[template]?.subject) {
        return this.options.html_templates[template].subject
        }
        switch(template) {
            case Templates.ORDER_PLACED:
                return "Order Confirmation"
            case Templates.USER_INVITED:
                return "You've been invited to join our platform"
            default:
                return "New Email"
        }
    }
    async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const template = this.getTemplate(notification.template as Templates)

    if (!template) {
      this.logger.error(`Couldn't find an email template for ${notification.template}. The valid options are ${Object.values(Templates)}`)
      return {}
    }

    const commonOptions = {
      from: this.options.from,
      to: [notification.to],
      subject: this.getTemplateSubject(notification.template as Templates),
    }

    let emailOptions: CreateEmailOptions
    if (typeof template === "string") {
      emailOptions = {
        ...commonOptions,
        html: template,
      }
    } else {
      emailOptions = {
        ...commonOptions,
        react: template(notification.data),
      }
    }

    const { data, error } = await this.resendClient.emails.send(emailOptions)

    if (error || !data) {
      if (error) {
        this.logger.error("Failed to send email", error)
      } else {
        this.logger.error("Failed to send email: unknown error")
      }
      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService