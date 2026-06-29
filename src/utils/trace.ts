import { shallowRef, type Ref } from 'vue'

export interface RequestTrace<TRequest, TResponse> {
  lastRequest: Ref<TRequest | null>
  lastResponse: Ref<TResponse | null>
  clearTrace: () => void
  recordRequest: (info: TRequest) => void
  recordResponse: (info: TResponse) => TResponse
}

export function createRequestTrace<TRequest, TResponse>(): RequestTrace<TRequest, TResponse> {
  const lastRequest = shallowRef<TRequest | null>(null) as Ref<TRequest | null>
  const lastResponse = shallowRef<TResponse | null>(null) as Ref<TResponse | null>

  function clearTrace() {
    lastRequest.value = null
    lastResponse.value = null
  }

  return {
    lastRequest,
    lastResponse,
    clearTrace,
    recordRequest(info) {
      lastRequest.value = info
      lastResponse.value = null
    },
    recordResponse(info) {
      lastResponse.value = info
      return info
    }
  }
}
