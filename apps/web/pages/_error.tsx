// Override Next.js default _error page to avoid useContext issues during static generation
function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'sans-serif', background: '#052E16', color: '#F0FDF4', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <h1 style={{ fontSize: '4rem', color: '#22C55E', margin: '0 0 1rem' }}>{statusCode || 'Error'}</h1>
        <p style={{ color: '#BBF7D0' }}>{statusCode === 404 ? 'Page not found' : 'An error occurred'}</p>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode?: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
