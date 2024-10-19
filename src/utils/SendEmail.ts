import nodemailer, { Transporter } from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import EnvConfig from '../config/envConfig';

// Define the structure of user data including email and optional attachments
interface UserData {
  user: {
    email: string;
  };
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

// Define additional data as a generic record of key-value pairs
type AdditionalData = Record<string, any>;

// Class for sending emails using nodemailer and ejs templates
export default class SendEmail {
  // Declare private properties for the email data, recipient email, and sender email
  private readonly data: UserData;
  private readonly to: string | undefined;
  private readonly from: string;

  // Constructor to initialize user data and set the 'to' and 'from' email addresses
  constructor(data: UserData) {
    this.data = data;
    this.to = data.user?.email;
    this.from = `Robin Mind <${EnvConfig.EMAIL_FROM}>`;
  }

  // Private method to create and return a nodemailer transporter instance with email server configuration
  private newTransport(): Transporter {
    return nodemailer.createTransport({
      host: EnvConfig.EMAIL_HOST,
      port: Number(EnvConfig.EMAIL_PORT),
      secure: true, // Use TLS for secure connections
      auth: {
        user: EnvConfig.EMAIL_USERNAME, // Username for SMTP authentication
        pass: EnvConfig.EMAIL_PASSWORD, // Password for SMTP authentication
      },
    });
  }

  // Public method to send an email using a specific template, subject, and optional additional data
  public async send(
    template: string,
    subject: string,
    additionalData: AdditionalData = {}
  ): Promise<void> {
    try {
      // Define the path to the ejs template for the email
      const templatePath = path.join(
        __dirname,
        `../views/emails/${template}.ejs`
      );

      // Render the ejs template with the user data, subject, and any additional data
      const html = await ejs.renderFile(templatePath, {
        data: { ...this.data, ...additionalData },
        subject,
      });

      // Define the mail options including sender, recipient, subject, HTML content, and optional attachments
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        attachments: this.data.attachments ?? [], // Attachments if provided
      };

      // Send the email using the transporter and mail options
      await this.newTransport().sendMail(mailOptions);
    } catch (error: any) {
      // Log and rethrow any errors that occur during the email sending process
      console.error(`Error sending email: ${error.message}`);
      throw error;
    }
  }

  // Public method to send a verification email using the 'verifyAccount' template
  public async verifyAccount(): Promise<void> {
    await this.send('verifyAccount', 'Email verification');
  }
}
