import test from 'ava'
import createSession, { SessionState } from 'prismy-session'
import { testServer } from 'prismy-test-server'
import got from 'got'
import { CookieJar } from 'tough-cookie'
import { SignedCookieStrategy } from '../src'

test('SignedCookieStrategy#finalize saves session.data if changed', async t => {
  const strategy = new SignedCookieStrategy({
    secret: 'test'
  })
  const { Session, sessionMiddleware } = createSession({
    strategy
  })
  class Handler {
    async handle(@Session() session: SessionState<any>) {
      session.data = {
        message: 'Hello, World!'
      }
      return 'OK'
    }
  }

  await testServer([sessionMiddleware, Handler], async url => {
    const postResponse = await got.post(url)
    t.deepEqual(postResponse.headers['set-cookie'], [
      `session=${encodeURIComponent(
        strategy.serialize({
          message: 'Hello, World!'
        })
      )}; Max-Age=86400; Path=/; HttpOnly`
    ])
  })
})

test('SignedCookieStrategy#finalize uses a function to determine secure attribute', async t => {
  const strategy = new SignedCookieStrategy({
    secret: 'test',
    secure: () => true
  })
  const { Session, sessionMiddleware } = createSession({
    strategy
  })
  class Handler {
    async handle(@Session() session: SessionState<any>) {
      session.data = {
        message: 'Hello, World!'
      }
      return 'OK'
    }
  }

  await testServer([sessionMiddleware, Handler], async url => {
    const postResponse = await got.post(url)
    t.deepEqual(postResponse.headers['set-cookie'], [
      `session=${encodeURIComponent(
        strategy.serialize({
          message: 'Hello, World!'
        })
      )}; Max-Age=86400; Path=/; HttpOnly; Secure`
    ])
  })
})

test('SignedCookieStrategy#loadData returns session data', async t => {
  const cookieJar = new CookieJar()
  const strategy = new SignedCookieStrategy({
    secret: 'test'
  })
  const { Session, sessionMiddleware } = createSession({
    strategy
  })
  class Handler {
    async handle(@Session() session: SessionState<any>) {
      return session.data
    }
  }

  await testServer([sessionMiddleware, Handler], async url => {
    cookieJar.setCookieSync(
      `session=${encodeURIComponent(
        strategy.serialize({
          message: 'Hello, World!'
        })
      )}; Max-Age=86400; Path=/; HttpOnly`,
      url
    )
    const postResponse = await got.post(url, {
      cookieJar,
      json: true
    })
    t.deepEqual(postResponse.body, {
      message: 'Hello, World!'
    })
  })
})

test('SignedCookieStrategy#loadData returns null if session data is invalid(Wrong format)', async t => {
  const cookieJar = new CookieJar()
  const strategy = new SignedCookieStrategy({
    secret: 'test'
  })
  const { Session, sessionMiddleware } = createSession({
    strategy
  })
  class Handler {
    async handle(@Session() session: SessionState<any>) {
      return session.data
    }
  }

  await testServer([sessionMiddleware, Handler], async url => {
    cookieJar.setCookieSync(
      `session=${encodeURIComponent(
        JSON.stringify({
          message: 'Unsigned value'
        })
      )}; Max-Age=86400; Path=/; HttpOnly`,
      url
    )
    const postResponse = await got.post(url, {
      cookieJar
    })
    t.is(postResponse.body, '')
  })
})

test('SignedCookieStrategy#loadData returns null if session data is invalid(Invalid signature)', async t => {
  const cookieJar = new CookieJar()
  const strategy = new SignedCookieStrategy({
    secret: 'test'
  })
  const { Session, sessionMiddleware } = createSession({
    strategy
  })
  class Handler {
    async handle(@Session() session: SessionState<any>) {
      return session.data
    }
  }

  await testServer([sessionMiddleware, Handler], async url => {
    cookieJar.setCookieSync(
      `session=${encodeURIComponent(
        's:' +
          JSON.stringify({
            message: 'Unsigned value'
          }) +
          '.invalid'
      )}; Max-Age=86400; Path=/; HttpOnly`,
      url
    )
    const postResponse = await got.post(url, {
      cookieJar
    })
    t.is(postResponse.body, '')
  })
})

test('SignedCookieStrategy#finalize touches maxAge if session data exists', async t => {
  const cookieJar = new CookieJar()
  const strategy = new SignedCookieStrategy({
    secret: 'test'
  })
  const { Session, sessionMiddleware } = createSession({
    strategy
  })
  class Handler {
    async handle(@Session() session: SessionState<any>) {
      return 'OK'
    }
  }

  await testServer([sessionMiddleware, Handler], async url => {
    cookieJar.setCookieSync(
      `session=${encodeURIComponent(
        strategy.serialize({
          message: 'Hello, World!'
        })
      )}; Max-Age=86400; Path=/; HttpOnly`,
      url
    )
    const postResponse = await got.post(url, {
      cookieJar
    })
    t.deepEqual(postResponse.headers['set-cookie'], [
      `session=${encodeURIComponent(
        strategy.serialize({
          message: 'Hello, World!'
        })
      )}; Max-Age=86400; Path=/; HttpOnly`
    ])
  })
})

test('SignedCookieStrategy#finalize does NOT touch maxAge if session data does not exist', async t => {
  const strategy = new SignedCookieStrategy({
    secret: 'test'
  })
  const { Session, sessionMiddleware } = createSession({
    strategy
  })
  class Handler {
    async handle(@Session() session: SessionState<any>) {
      return 'OK'
    }
  }

  await testServer([sessionMiddleware, Handler], async url => {
    const postResponse = await got.post(url)
    t.is(postResponse.headers['set-cookie'], undefined)
  })
})

test('SignedCookieStrategy#finalize destroys session.data if changed to null', async t => {
  const cookieJar = new CookieJar()
  const strategy = new SignedCookieStrategy({
    secret: 'test'
  })
  const { Session, sessionMiddleware } = createSession({
    strategy
  })
  class Handler {
    async handle(@Session() session: SessionState<any>) {
      session.data = null
      return 'OK'
    }
  }

  await testServer([sessionMiddleware, Handler], async url => {
    cookieJar.setCookieSync(
      `session=${encodeURIComponent(
        strategy.serialize({
          message: 'Hello, World!'
        })
      )}; Max-Age=86400; Path=/; HttpOnly`,
      url
    )
    const postResponse = await got.post(url, {
      cookieJar
    })
    t.deepEqual(postResponse.headers['set-cookie'], [
      `session=; Max-Age=0; Path=/; HttpOnly`
    ])
  })
})
