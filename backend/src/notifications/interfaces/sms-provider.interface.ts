export interface ISmsProvider {
  /**
   * Sends an SMS message to the given mobile number.
   * @param to   Recipient phone number (E.164 format recommended)
   * @param message  Plain-text message body
   */
  sendSms(to: string, message: string): Promise<void>;
}
