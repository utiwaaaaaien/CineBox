// The database is optional in this browser-local application. The runtime guard
// in getDb() requires a real binding before an opt-in database route can use it.
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
  }
}
