import { ProviderOutputValidationError } from '@vibey/api-shared'
import { buildErrorEnvelope } from './artifact-error-classifier'

export function buildOpenRouterImageFailure(error: unknown) {
  if (!(error instanceof ProviderOutputValidationError)) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OpenRouter image generation failed',
    }
  }
  return buildErrorEnvelope(error, {
    errorCode: 'ARTIFACT_IMAGE_OUTPUT_VALIDATION_FAILED',
    errorClass: 'system_fault',
    workflowClass: 'media_generation',
    reliability: 'high_confidence',
    effectState: error.providerEffectConfirmed ? 'succeeded_delivery_failed' : 'unknown_effect',
    retryPolicy: {
      mode: 'do_not_retry_terminal',
      max_attempts: 0,
      stop_after_same_error: true,
      reason:
        'The provider may already have completed and billed the image. Repeating the payload could create another charge.',
    },
    correction: {
      summary:
        'Stop automatic retries and inspect the provider billing attempt before generating again.',
    },
    fallback: null,
    agentDiagnosis: error.providerEffectConfirmed
      ? 'OpenRouter completed and billed the image, but the returned output failed application validation.'
      : 'OpenRouter returned an output the application could not validate, and the billing effect is not yet known.',
    agentInstruction:
      'Do not call generate_image again for this request. Tell the user the attempt was stopped to prevent a duplicate charge.',
    userExplanation: {
      intent: 'prevent_duplicate_image_charge',
      sentence:
        'I stopped this image attempt because the provider response could not be safely validated, and retrying could create a duplicate charge.',
    },
    observability: {
      fingerprint: 'artifact.image_output_validation_failed',
      report_level: 'error',
    },
  })
}
