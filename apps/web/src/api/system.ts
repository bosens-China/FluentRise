import { get } from '../utils/request'

export interface Quote {
  en: string
  zh: string
}

export const systemApi = {
  /**
   * 获取鼓励语录
   * @param count 获取的数量，默认5条
   */
  getQuotes: (count: number = 5) => {
    return get<Quote[]>('/system/quotes', {
      params: { count },
    })
  },
}
