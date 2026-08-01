'use client'

/**
 * Passkey (barmoq izi / Face ID) kirish marosimi — IKKI BOSQICHLI.
 *
 * `supabase.auth.signInWithPasskey()` uchala qadamni bitta chaqiruvda
 * bajaradi: challenge olish → `navigator.credentials.get()` → tekshirish.
 * Bizga bu to'g'ri kelmaydi, chunki BIRINCHI qadam tarmoq so'rovi bo'lib,
 * u barmoq izi oynasidan OLDIN turadi:
 *
 *   tugma bosildi → [~300-500 ms kutish] → barmoq izi oynasi
 *
 * Shuning uchun Supabase'ning ochiq ikki bosqichli API'sini ishlatamiz
 * (`supabase.auth.passkey.startAuthentication` / `verifyAuthentication` —
 * `signInWithPasskey` ham aynan shularni chaqiradi, ya'ni ayni bir server
 * yo'li va sessiya saqlash mantig'i). Challenge sahifa ochilishida oldindan
 * olinadi, tugma bosilganda esa `navigator.credentials.get()` DARHOL
 * chaqiriladi.
 *
 * Qo'shimcha foyda: click handler ichida endi `await fetch(...)` yo'q.
 * Safari/iOS bunday kutishdan keyin "transient user activation"ni yo'qotilgan
 * deb hisoblab, marosimni rad etardi — "Non-Webauthn related error"ning
 * asosiy sababi shu edi.
 */

import { supabase } from '@/lib/supabase'

// ── base64url ↔ ArrayBuffer ──────────────────────────────────────────────
// Faqat WebAuthn Level 3 metodlari (`parseRequestOptionsFromJSON`, `toJSON`)
// mavjud bo'lmagan eski brauzerlar uchun zaxira yo'l.

function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

type RequestOptionsJSON = {
  challenge: string
  allowCredentials?: Array<{ id: string; type?: string; transports?: string[] }>
  [key: string]: unknown
}

function deserializeRequestOptions(options: RequestOptionsJSON): PublicKeyCredentialRequestOptions {
  const PKC = window.PublicKeyCredential as unknown as {
    parseRequestOptionsFromJSON?: (o: RequestOptionsJSON) => PublicKeyCredentialRequestOptions
  }
  if (typeof PKC?.parseRequestOptionsFromJSON === 'function') {
    return PKC.parseRequestOptionsFromJSON(options)
  }

  const { challenge, allowCredentials, ...rest } = options
  const result = {
    ...rest,
    challenge: base64UrlToBuffer(challenge),
  } as unknown as PublicKeyCredentialRequestOptions

  if (allowCredentials?.length) {
    result.allowCredentials = allowCredentials.map((cred) => ({
      ...cred,
      id: base64UrlToBuffer(cred.id),
      type: (cred.type || 'public-key') as 'public-key',
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    }))
  }
  return result
}

function serializeAssertion(credential: PublicKeyCredential): Record<string, unknown> {
  const withJson = credential as unknown as { toJSON?: () => Record<string, unknown> }
  if (typeof withJson.toJSON === 'function') return withJson.toJSON()

  const response = credential.response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    // W3C JSON formatida `rawId` `id` bilan bir xil base64url qiymat
    rawId: credential.id,
    response: {
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : undefined,
    },
    type: 'public-key',
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment:
      (credential as unknown as { authenticatorAttachment?: string }).authenticatorAttachment ?? undefined,
  }
}

type CreationOptionsJSON = {
  challenge: string
  user: { id: string; [key: string]: unknown }
  excludeCredentials?: Array<{ id: string; type?: string; transports?: string[] }>
  [key: string]: unknown
}

function deserializeCreationOptions(options: CreationOptionsJSON): PublicKeyCredentialCreationOptions {
  const PKC = window.PublicKeyCredential as unknown as {
    parseCreationOptionsFromJSON?: (o: CreationOptionsJSON) => PublicKeyCredentialCreationOptions
  }
  if (typeof PKC?.parseCreationOptionsFromJSON === 'function') {
    return PKC.parseCreationOptionsFromJSON(options)
  }

  const { challenge, user, excludeCredentials, ...rest } = options
  const result = {
    ...rest,
    challenge: base64UrlToBuffer(challenge),
    user: { ...user, id: base64UrlToBuffer(user.id) },
  } as unknown as PublicKeyCredentialCreationOptions

  if (excludeCredentials?.length) {
    result.excludeCredentials = excludeCredentials.map((cred) => ({
      ...cred,
      id: base64UrlToBuffer(cred.id),
      type: (cred.type || 'public-key') as 'public-key',
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    }))
  }
  return result
}

function serializeAttestation(credential: PublicKeyCredential): Record<string, unknown> {
  const withJson = credential as unknown as { toJSON?: () => Record<string, unknown> }
  if (typeof withJson.toJSON === 'function') return withJson.toJSON()

  const response = credential.response as AuthenticatorAttestationResponse
  return {
    id: credential.id,
    rawId: credential.id,
    response: {
      attestationObject: bufferToBase64Url(response.attestationObject),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    },
    type: 'public-key',
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment:
      (credential as unknown as { authenticatorAttachment?: string }).authenticatorAttachment ?? undefined,
  }
}

// ── Ommaviy API ──────────────────────────────────────────────────────────

export type PasskeyChallenge = {
  challengeId: string
  publicKey: PublicKeyCredentialRequestOptions
  /** ms-epoch */
  expiresAt: number
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.get === 'function'
  )
}

/** `expires_at` unix soniyada ham, millisekundda ham kelishi mumkin. */
function normalizeExpiry(value: number | undefined): number {
  if (!value) return Date.now() + 60_000
  return value < 1e12 ? value * 1000 : value
}

/** Serverdan yangi challenge oladi. Sahifa ochilishida oldindan chaqiriladi. */
export async function fetchPasskeyChallenge(): Promise<PasskeyChallenge> {
  const { data, error } = await supabase.auth.passkey.startAuthentication()
  if (error) throw error
  if (!data) throw new Error('Passkey challenge olinmadi')

  return {
    challengeId: data.challenge_id,
    publicKey: deserializeRequestOptions(data.options as unknown as RequestOptionsJSON),
    expiresAt: normalizeExpiry(data.expires_at),
  }
}

/**
 * Challenge hali yaroqlimi? 5 soniya zaxira qoldiramiz — marosim davomida
 * muddati o'tib ketmasligi uchun. Kirish (`PasskeyChallenge`) va
 * ro'yxatdan o'tish (`PasskeyRegistrationChallenge`) challenge'lari uchun
 * umumiy — ikkalasida ham `expiresAt` bor.
 */
export function isChallengeUsable<T extends { expiresAt: number }>(challenge: T | null): challenge is T {
  return !!challenge && challenge.expiresAt - 5_000 > Date.now()
}

/**
 * Marosimni yakunlaydi: barmoq izi oynasini ochadi va natijani serverda
 * tekshiradi. Muvaffaqiyatda sessiya cookie'lari Supabase klienti tomonidan
 * saqlanadi (`verifyAuthentication` ichida `_saveSession` chaqiriladi).
 */
export async function loginWithPasskeyChallenge(
  challenge: PasskeyChallenge,
  signal?: AbortSignal
): Promise<{ userId: string; accessToken: string }> {
  const credential = (await navigator.credentials.get({
    publicKey: challenge.publicKey,
    signal,
  })) as PublicKeyCredential | null

  if (!credential) {
    throw new DOMException('Passkey marosimi bekor qilindi', 'NotAllowedError')
  }

  const { data, error } = await supabase.auth.passkey.verifyAuthentication({
    challengeId: challenge.challengeId,
    credential: serializeAssertion(credential) as never,
  })

  if (error) throw error
  if (!data?.session || !data.user) throw new Error('Sessiya yaratilmadi')

  return { userId: data.user.id, accessToken: data.session.access_token }
}

export type PasskeyRegistrationChallenge = {
  challengeId: string
  publicKey: PublicKeyCredentialCreationOptions
  /** ms-epoch */
  expiresAt: number
}

/**
 * Barmoq izini YOQISH uchun challenge — LOGIN bilan bir xil sabab bilan
 * ikki bosqichga bo'lingan: `supabase.auth.registerPasskey()` bitta
 * chaqiruvda challenge oladi VA `navigator.credentials.create()`ni
 * chaqiradi — orasida tarmoq so'rovi (`await`) bo'lgani uchun ba'zi mobil
 * brauzerlar (ayniqsa Android/Chrome) "transient user activation"ni
 * yo'qotilgan deb hisoblab, "A non-webauthn related error has occurred"
 * xatosi bilan rad etadi. Shu sababli bu yerda ham challenge OLDINDAN
 * (tugma bosilishidan oldin) olinadi, tugma bosilganda esa
 * `navigator.credentials.create()` DARHOL chaqiriladi.
 */
export async function fetchPasskeyRegistrationChallenge(): Promise<PasskeyRegistrationChallenge> {
  const { data, error } = await supabase.auth.passkey.startRegistration()
  if (error) throw error
  if (!data) throw new Error('Passkey ro\'yxatdan o\'tish challenge olinmadi')

  return {
    challengeId: data.challenge_id,
    publicKey: deserializeCreationOptions(data.options as unknown as CreationOptionsJSON),
    expiresAt: normalizeExpiry(data.expires_at),
  }
}

/**
 * Ro'yxatdan o'tish marosimini yakunlaydi: barmoq izi oynasini ochadi va
 * natijani serverda tekshiradi.
 */
export async function registerPasskeyWithChallenge(
  challenge: PasskeyRegistrationChallenge,
  signal?: AbortSignal
): Promise<void> {
  const credential = (await navigator.credentials.create({
    publicKey: challenge.publicKey,
    signal,
  })) as PublicKeyCredential | null

  if (!credential) {
    throw new DOMException('Passkey ro\'yxatdan o\'tish bekor qilindi', 'NotAllowedError')
  }

  const { error } = await supabase.auth.passkey.verifyRegistration({
    challengeId: challenge.challengeId,
    credential: serializeAttestation(credential) as never,
  })

  if (error) throw error
}

export type PasskeyFailure = 'cancelled' | 'unsupported' | 'network' | 'unknown'

/**
 * Xato turini aniqlaydi.
 *
 * Muhim: biz `navigator.credentials.get()`ni O'ZIMIZ chaqirganimiz uchun
 * brauzerning asl `DOMException`i (nomi saqlangan holda) qo'limizga tegadi.
 * Ilgari xato `new Error(message)` ichiga o'ralib, `name` yo'qolar edi va
 * `err.name === 'NotAllowedError'` tekshiruvi hech qachon ishlamasdi.
 */
export function classifyPasskeyError(err: unknown): PasskeyFailure {
  const name = (err as { name?: string } | null)?.name

  // NotAllowedError — foydalanuvchi bekor qildi yoki vaqt tugadi. Brauzer
  // ataylab sababni oshkor qilmaydi (foydalanuvchi ma'lumotini himoya qilish
  // uchun), shuning uchun ikkalasini ham "bekor qilindi" deb hisoblaymiz.
  // AbortError — marosimni biz `AbortController` orqali to'xtatdik.
  if (name === 'NotAllowedError' || name === 'AbortError') return 'cancelled'

  if (name === 'NotSupportedError' || name === 'SecurityError' || name === 'InvalidStateError') {
    return 'unsupported'
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network'
  if (name === 'AuthRetryableFetchError') return 'network'

  return 'unknown'
}
