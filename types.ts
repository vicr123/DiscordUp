export type TransactionId = string;

export type UpTransactionStatus = "HELD" | "SETTLED";

export type CardPurchaseMethodEnum = "BAR_CODE" | "OCR" | "CARD_PIN" | "CARD_DETAILS" | "CARD_ON_FILE" | "ECOMMERCE" | "MAGNETIC_STRIPE" | "CONTACTLESS";

export interface MoneyObject {
    currencyCode: string,
    value: string,
    valueInBaseUnits: number
}

export interface UpHoldInfo {
    amount: MoneyObject,
    foreignAmount?: MoneyObject,
}

export interface RoundUpObject {
    amount: MoneyObject,
    boostPortion?: MoneyObject,
}

export interface CashbackObject {
    description: string,
    amount: MoneyObject,
}

export interface CardPurchaseMethodObject {
    method: CardPurchaseMethodEnum,
    cardNumberSuffix?: string,
}

export interface NoteObject {
    text: string,
}

export interface CustomerObject {
    displayName: string,
}

export interface UpCategory {
    type: string,
    id: string,
    attributes: {
        name: string
    },
    relationships: {
        parent: {
            data?: {
                type: string,
                id: string,
            },
            links?: {
                related: string
            }
        },
        children: {
            data: {
                type: string,
                id: string,
            }[]
            links?: {
                related: string
            }
        }
    },
    links?: {
        self: string
    }
}

export interface TransactionResource {
    type: string,
    id: string,
    attributes: {
        status: UpTransactionStatus,
        rawText?: string,
        description: string,
        message?: string,
        isCategorizable: boolean,
        holdInfo?: UpHoldInfo,
        roundUp?: RoundUpObject,
        cashback?: CashbackObject,
        amount: MoneyObject,
        foreignAmount?: MoneyObject,
        cardPurchaseMethod?: CardPurchaseMethodObject,
        settledAt?: string,
        craetedAt: string,
        transactionType?: string,
        note?: NoteObject,
        performingCustomer?: CustomerObject,
        deepLinkURL: string,
    },
    relationships: {
        account: {
            data: {
                type: "accounts",
                id: string,
            },
            links?: {
                related: string
            }
        },
        transferAccount: {
            data?: {
                type: "accounts",
                id: string,
            },
            links?: {
                related: string
            }
        },
        category: {
            data?: {
                type: "categories",
                id: string,
            },
            links?: {
                self: string,
                related?: string
            }
        },
        parentCategory: {
            data?: {
                type: "categories",
                id: string,
            },
            links?: {
                related: string
            }
        },
        tags: {
            data: {
                type: "tags",
                id: string,
            }[],
            links?: {
                self: string,
            }
        },
        attachment: {
            data?: {
                type: "attachments",
                id: string,
            },
            links?: {
                related: string
            }
        }
    },
    links?: {
        self: string
    }
}

export interface UpCategoryResponse {
    data: UpCategory[]
}

export interface UpTransactionIdResponse {
    data: TransactionResource
}