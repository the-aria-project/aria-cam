type T_devLog = (...args: any[]) => void

const devLog: T_devLog = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    for (const arg in args) {
      process.stdout.write(args[arg] + '\n')
    }
  }
}

export default devLog
