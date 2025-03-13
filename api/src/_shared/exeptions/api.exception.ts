import { HttpException } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import { type ErrorCodeEnum, ErrorCodeMsg } from "shared";

export class ApiException extends HttpException {
  private errorCode: ErrorCodeEnum;
  private errorMessage: ErrorCodeMsg;
  private readonly data?: any;

  constructor(errorCode: ErrorCodeEnum, statusCode: HttpStatus = HttpStatus.OK, data?: any) {
    const errorMessage = ErrorCodeMsg[errorCode] as unknown as ErrorCodeMsg;
    super(errorMessage, statusCode, data);
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.data = data;
  }

  gerErrorCode(): ErrorCodeEnum {
    return this.errorCode;
  }

  getErrorMessage(): ErrorCodeMsg {
    return this.errorMessage;
  }

  getData(): any {
    return this.data;
  }
}

interface ApiExceptionOption {
  errorCode: ErrorCodeEnum;
  statusCode: HttpStatus;
  data?: any;
}
