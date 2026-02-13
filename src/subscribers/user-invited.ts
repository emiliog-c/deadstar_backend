import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function inviteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  id: string
}>) {
  const query = container.resolve("query")
  const notificationModuleService = container.resolve(
    "notification"
  )
  const config = container.resolve("configModule")

  const { data: [invite] } = await query.graph({
    entity: "invite",
    fields: [
      "email",
      "token",
    ],
    filters: {
      id: data.id,
    },
  })

  const backendUrl =
    process.env.ADMIN_CORS
      ?.split(",")
      .map((value) => value.trim())
      .find(Boolean) ||
    "http://localhost:9000"

  const normalizedBackendUrl = backendUrl.replace(/\/$/, "")
  const rawAdminPath = config?.admin?.path || "/app"
  const normalizedAdminPath = rawAdminPath.startsWith("/")
    ? rawAdminPath
    : `/${rawAdminPath}`

  await notificationModuleService.createNotifications({
    to: invite.email,
    // TODO replace with template ID in notification provider
    template: "user-invited",
    channel: "email",
    data: {
      invite_url: `${normalizedBackendUrl}${normalizedAdminPath}/invite?token=${encodeURIComponent(invite.token)}`,
    },
  })
}

export const config: SubscriberConfig = {
  event: [
    "invite.created",
    "invite.resent",
  ],
}