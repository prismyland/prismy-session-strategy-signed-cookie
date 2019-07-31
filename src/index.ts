import { Context } from 'prismy'
import {
  createCookieSelector,
  CookieStore,
  CookieSerializeOptions
} from 'prismy-cookie'
import { sign, unsign } from 'cookie-signature'
import { Strategy, SessionState } from 'prismy-session'

export interface SignedCookieStrategyOptions {
  name?: string
  secret: string
  secure?: boolean | ((context: Context) => boolean)
  maxAge?: number
  domain?: string
  httpOnly?: boolean
  path?: string
  sameSite?: boolean | 'lax' | 'strict' | 'none'
}

type DefaultOptionKeys = 'name' | 'maxAge' | 'httpOnly' | 'secure' | 'path'

type InternalSignedCookieStrategyOptions = Required<
  Pick<SignedCookieStrategyOptions, DefaultOptionKeys>
> &
  Omit<SignedCookieStrategyOptions, DefaultOptionKeys>

const signedCookieRegExp = /^s:.+/

export class SignedCookieStrategy implements Strategy {
  value?: unknown
  options: InternalSignedCookieStrategyOptions
  cookieStoreSymbol = Symbol('prismy-session-cookie-store')

  constructor(options: SignedCookieStrategyOptions) {
    this.options = {
      name: 'session',
      maxAge: 86400,
      httpOnly: true,
      secure: false,
      path: '/',
      ...options
    }
  }

  loadData(context: Context): unknown | null {
    const cookieStore = this.getCookieStore(context)
    const cookie = cookieStore.get()

    if (cookie[this.options.name] == null) return null
    const serializedData = cookie[this.options.name]

    return this.deserialize(serializedData)
  }

  getCookieStore(context: Context) {
    let cookieStore: CookieStore | undefined = context[this.cookieStoreSymbol]
    if (cookieStore == null) {
      context[this.cookieStoreSymbol] = cookieStore = createCookieSelector()(
        context
      )
    }
    return cookieStore
  }

  async finalize(context: Context, session: SessionState) {
    if (session.data === session.previousData) {
      if (session.data == null) {
        return
      } else {
        await this.touch(context, session)
        return
      }
    } else {
      if (session.data == null) {
        await this.destroy(context, session)
        return
      } else {
        await this.save(context, session)
        return
      }
    }
  }

  touch(context: Context, session: SessionState) {
    return this.save(context, session)
  }

  save(context: Context, session: SessionState) {
    const cookieStore = this.getCookieStore(context)
    cookieStore.set([
      this.options.name,
      this.serialize(session.data),
      this.getCookieOptions(context)
    ])
  }

  destroy(context: Context, session: SessionState) {
    const cookieStore = this.getCookieStore(context)
    cookieStore.set([
      this.options.name,
      '',
      {
        ...this.getCookieOptions(context),
        maxAge: 0
      }
    ])
  }

  serialize(data: any): string {
    return `s:${sign(JSON.stringify(data), this.options.secret)}`
  }

  deserialize(serializedData: string): unknown | null {
    if (!signedCookieRegExp.test(serializedData)) {
      return null
    }

    // FIXME: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/37228
    const unsignedData = unsign(
      serializedData.substring(2),
      this.options.secret
    ) as string | false
    if (unsignedData === false) {
      return null
    }

    return JSON.parse(unsignedData)
  }

  getCookieOptions(context: Context): CookieSerializeOptions {
    const { secure, maxAge, domain, httpOnly, path, sameSite } = this.options

    return {
      secure: typeof secure === 'boolean' ? secure : secure(context),
      maxAge,
      domain,
      httpOnly,
      path,
      sameSite
    }
  }
}

export default SignedCookieStrategy
