/** User-facing toast messages for campaign finance errors */
export const CAMPAIGN_FINANCE_TOAST_ERRORS = {
  ARCHIVE_PRODUCT_FAILED: { userMessage: "Couldn't archive product. Try again." },
  DELETE_PRODUCT_FAILED: { userMessage: "Couldn't delete product. Try again." },
  CREATE_PRODUCT_FAILED: { userMessage: "Couldn't create product. Try again." },
  CREATE_PAYMENT_LINK_FAILED: { userMessage: "Couldn't create payment link. Try again." },
  CREATE_COUPON_FAILED: { userMessage: "Couldn't create coupon. Try again." },
  RENAME_PRODUCT_FAILED: { userMessage: "Couldn't rename product. Try again." },
} as const
