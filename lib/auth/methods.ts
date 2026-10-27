/** Shared method capability and identity rules; no local provider implementation. */
export {
  SIGNIN_PROVIDER_ID,
  ORANGECAT_PROVIDER_ID,
  ORANGECAT_DEFAULT_ISSUER,
  usableIssuer,
  signinBroker,
  orangecatOidc,
  oidcClients,
  signInMethods,
  placeholderEmail,
  isDeliverable,
  type OidcProviderId,
  type OidcClient,
  type SignInMethods,
} from "@bitbaum/accountkit/auth";
