import { Request, Response, NextFunction } from 'express'
import { User, userModel } from '../models/User'
import ResManager from '../util/ResManager'
import UserActions from '../actions/UserActions'
import { ResInfo } from '../util/ResManager'
import { imageModel } from '../models/Image'

export default class UserController {
	/**
	 * @desc        Get user
	 * @route       GET /user/:username
	 * @access      Public
	 */

	public static async getUser(req: Request, res: Response, next: NextFunction): Promise<Response> {
		const [requestedUser, requestedUserErr] = await UserActions.getUserFromRequest(req)
		const [currentUser, currentUserErr] = await UserActions.getUserFromCookeis(req)

		if (requestedUserErr) {
			return res.status(requestedUserErr.code).json(requestedUserErr.resBody)
		} else if (requestedUser && currentUser) {
			const userAccessibleData = await UserActions.getProfileData(requestedUser, currentUser.id)
			return res.status(200).json(ResManager.success(userAccessibleData))
		}
		return res.sendStatus(500)
	}

	/**
	 * @desc        Update me
	 * @route       PUT /user
	 * @access      Private
	 */

	public static async updateUser(req: Request, res: Response, next: NextFunction): Promise<Response> {
		const [user, err] = await UserActions.getUserFromCookeis(req)
		if (err) {
			return res.status(err.code).json(err.resBody)
		} else if (user) {
			let userAccessibleData = userModel.fillAccessibleColumns({ ...req.body })
			try {
				await userModel.updateWhere({ id: user.id }, userAccessibleData)
				if (req.body.interests) await UserActions.setInterests(Number(user.id), req.body.interests)
				if (req.body.lookingFor) await UserActions.setLookingFor(Number(user.id), req.body.lookingFor)
				const [updatedUser, updatedErr] = await UserActions.getUserById(user.id)
				if (updatedUser) {
					const updatedProfile = await UserActions.getProfileData(updatedUser, user.id)
					return res.status(200).json(ResManager.success(updatedProfile))
				}
			} catch (e) {
				return res.status(406).json(ResManager.error(e.message))
			}
		}
		return res.sendStatus(500)
	}

	/**
	 * @desc        Delete me
	 * @route       DELETE /user
	 * @access      Private
	 */

	public static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<Response> {
		return res.json('Delete user not works yet')
	}

	/** @todo move interests regueest and routes */

	/**
	 * @desc        Get user interests
	 * @route       GET /user/:id/interests
	 * @access      Public
	 */

	public static async getInterests(req: Request, res: Response, next: NextFunction): Promise<Response> {
		const interests = await UserActions.getInterests(Number(req.params.id))
		return res.status(200).json(ResManager.success(interests))
	}

	/**
	 * @desc        Set user interests
	 * @route       POST /user/:id/interests
	 * @access      Public
	 */

	public static async setUserInterests(req: Request, res: Response, next: NextFunction): Promise<Response> {
		const result = await UserActions.setInterests(Number(req.params.id), req.body.interests)
		if (result instanceof ResInfo) {
			return res.status(result.code).json(result.resBody)
		}
		return res.status(200).json()
	}
}
