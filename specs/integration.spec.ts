import test from 'ava'
import createSession, { SessionState } from 'prismy-session'
import { Method } from 'prismy'
import { testServer } from 'prismy-test-server'
import got from 'got'
import { CookieJar } from 'tough-cookie'
import { SignedCookieStrategy } from '../src'

test('integration test', async t => {
  const cookieJar = new CookieJar()
  const { Session, SessionMiddleware } = createSession(
    new SignedCookieStrategy({
      secret: 'test'
    })
  )
  class Handler {
    async handle(
      @Method() method: string,
      @Session() session: SessionState<any>
    ) {
      if (method === 'POST') {
        session.data = { message: 'Hello, World!' }
        return 'OK'
      } else {
        const { data } = session
        return data.message
      }
    }
  }

  await testServer([SessionMiddleware, Handler], async url => {
    const postResponse = await got.post(url, {
      cookieJar
    })
    t.is(postResponse.body, 'OK')

    const getResponse = await got(url, {
      cookieJar,
      retry: 0
    })
    t.is(getResponse.body, 'Hello, World!')
  })
})
