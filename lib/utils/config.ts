import * as dotenv from "dotenv";

const path = '.env'
dotenv.config({path: path})
export const YOUR_IP: string = process.env.ip as string
export const KEY_NAME: string = process.env.keyName as string



