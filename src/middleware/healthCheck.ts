import { Router, Request, Response } from 'express'

const router = Router()

router.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    message: 'All up and running !!',
  })
})

export default router
