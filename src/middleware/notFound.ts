import { Request, Response, NextFunction } from 'express'

const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const err = new Error('Not Found')
  res.status(404).json({
    error: {
      message: err.message,
    },
  })
}

export default notFound
