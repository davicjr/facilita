import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipNotify?: boolean;
  }
}
