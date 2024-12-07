import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService]
})
export class MailModule {}
