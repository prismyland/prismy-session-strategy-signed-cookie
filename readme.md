# `prismy-session-strategy-signed-cookie`

Signed cookie session strategy for prismy

[![Build Status](https://travis-ci.com/prismyland/prismy-session-strategy-signed-cookie.svg?branch=master)](https://travis-ci.com/prismyland/prismy-session-strategy-signed-cookie)
[![codecov](https://codecov.io/gh/prismyland/prismy-session-strategy-signed-cookie/branch/master/graph/badge.svg)](https://codecov.io/gh/prismyland/prismy-session-strategy-signed-cookie)
[![NPM download](https://img.shields.io/npm/dm/prismy-session-strategy-signed-cookie.svg)](https://www.npmjs.com/package/prismy-session-strategy-signed-cookie)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/prismyland/prismy-session-strategy-signed-cookie.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/prismyland/prismy-session-strategy-signed-cookie/context:javascript)

```
npm i prismy-session prismy-session-strategy-signed-cookie
```

## Example

```ts
import {
  prismy,
  Method,
  BaseHandler,
  createInjectDecorators,
  createTextBodySelector
} from 'prismy'
import createSession, { SessionState } from 'prismy-session'
import querystring from 'querystring'
import SignedCookieStrategy from 'prismy-session-strategy-signed-cookie'

const { Session, sessionMiddleware } = createSession({
  strategy: new SignedCookieStrategy({
    secret: 'RANDOM_HASH'
  })
})

const UrlencodedBody = () =>
  createInjectDecorators(async context => {
    const textBody = await createTextBodySelector()(context)
    return querystring.parse(textBody)
  })

class MyHandler extends BaseHandler {
  async handle(
    @Method() method: string,
    @Session() session: SessionState,
    @UrlencodedBody() body: any
  ) {
    if (method === 'POST') {
      // Update session data
      session.data = { message: body.message }
      return this.redirect('/')
    } else {
      // Get session data
      const { data } = session
      return [
        '<!DOCTYPE html>',
        '<body>',
        `<p>Message: ${data != null ? data.message : 'NULL'}</p>`,
        '<form action="/" method="post">',
        '<input name="message">',
        '<button type="submit">Send</button>',
        '</form>',
        '</body>'
      ].join('')
    }
  }
}

export default prismy([sessionMiddleware, MyHandler])
```
