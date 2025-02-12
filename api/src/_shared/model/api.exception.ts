import { HttpException } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import { type ErrorCodeEnum, ErrorCodeMsg } from "shared";

export class ApiException extends HttpException {
  private errorCode: ErrorCodeEnum;
  private errorMessage: ErrorCodeMsg;

  constructor(errorCode: ErrorCodeEnum, statusCode: HttpStatus = HttpStatus.OK) {
    const errorMessage = ErrorCodeMsg[errorCode] as unknown as ErrorCodeMsg;
    super(errorMessage, statusCode);
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
  }

  gerErrorCode(): ErrorCodeEnum {
    return this.errorCode;
  }

  getErrorMessage(): ErrorCodeMsg {
    return this.errorMessage;
  }
}
