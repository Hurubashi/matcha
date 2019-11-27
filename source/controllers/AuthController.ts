import {Request, Response, NextFunction} from "express"
import Controller from './Controller'
import {User, UserModel} from "../models/User"
import Joi from "joi"
import bcrypt from "bcrypt"
import uuidv1 from "uuid/v1"
import {UserActivationUUID, UserActivationUUIDModel} from "../models/UserActivationUUID"
import {UserSession, UserSessionModel} from "../models/UserSession"
import pug from "pug"
import MailService from "../util/MailService"
import path from "path"
import jwt from "jsonwebtoken"

export default class AuthController extends Controller {

	static userModel = new UserModel()

	/**
	 * @desc        Login user
	 * @route       POST /api/auth/register
	 * @access      Public
	 */

	public static async register(req: Request, res: Response, next: NextFunction) {
		// Validate
		let err = this.userModel.validate(req.body)
		if (err)
			return res.status(400).json(this.error(err.message))
		// Hash password
		req.body.password = await bcrypt.hash(req.body.password, String(process.env.ENCRYPTION_SALT))
		// Insert to db
		let user = await this.userModel.create(req.body)
		if (this.userModel.isInstance(user)) {
			const uuid = uuidv1()
			const userActivationUUID: UserActivationUUID = {user_id: user.id, uuid: uuid}
			const userActivationUUIDModel = new UserActivationUUIDModel()
			await userActivationUUIDModel.create(userActivationUUID)

			const letter = pug.renderFile( path.resolve('public/letters/AccountCreated.pug'), {
				name: user.first_name + user.last_name,
				link: req.protocol + '://' + req.get('host') + 'api//auth/verify/' + user.id + '/' + uuid,
				imgSrc: req.protocol + '://' + req.get('host') + "public/images/dating.jpg"
			})
			await MailService.sendMail('hurubashi@gmail.com', 'registration', letter)
			const options = {
				expires: new Date(
					Date.now() + Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
				),
				httpOnly: true
			}

			const token = jwt.sign({ id: user.id }, uuid, {expiresIn: Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60})
			return res
				.status(201)
				.cookie('token', token, options)
				.json(this.success(user))
		} else {
			return res.status(400).json(this.error(user.message))
		}
	}

	/**
	 * @desc        Login user
	 * @route       POST /api/auth/login
	 * @access      Public
	 */

	public static async login(req: Request, res: Response, next: NextFunction) {
		const user = await this.userModel.getOneWith({username: req.body.username})
		const password = await bcrypt.hash(req.body.password, String(process.env.ENCRYPTION_SALT))

		if(this.userModel.isInstance(user)){

			if (user.password != password)
				return res.status(404).json(this.error('Wrong username or password'))

			if (!user.is_verified)
				return res
					.status(403)
					.json(this.error('User is not verified. Check your email for verification link.'))

			let userSessionModel = new UserSessionModel()
			let session = await userSessionModel.getOne(user.id)
			if (userSessionModel.isInstance(session)) {
				const options = {
					expires: new Date(
						Date.now() + Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
					),
					httpOnly: true
				}

				const token = jwt.sign({ id: user.id }, session.uuid, {expiresIn: Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60})
				return res.status(200)
					.cookie('token', token, options)
					.json(this.success(user))
			}
		} else
			return res.status(404).json(this.error(user.message))
	}

	/**
	 * @desc        Log user out / clear cookie
	 * @route       POST /api/auth/logout
	 * @access      Private
	 */

	public static async logout(req: Request, res: Response, next: NextFunction) {
		// res.cookie('token', 'none', {
		// 	expires: new Date(Date.now() + 10 * 1000),
		// 	httpOnly: true
		// })
		//
		// res.status(200).json({
		// 	success: true,
		// 	data: {}
		// })
		return res.json("User logout")
	}

	/**
	 * @desc        Get current logged in user
	 * @route       POST /api/auth/me
	 * @access      Private
	 */

	public static async getMe(req: Request, res: Response, next: NextFunction) {
		// const user = await User.getUser(Number(req.params.id))
		//
		// res.status(200).json({
		// 	success: true,
		// 	data: user
		// })
		return res.json("Get me")

	}

	/**
	 * @desc        Verify user
	 * @route       POST /api/auth/verify/:id/:uuid
	 * @access      Public
	 */

	public static async verify(req: Request, res: Response, next: NextFunction) {
		let userActivationUUIDModel = new UserActivationUUIDModel()
		const userId = Number(req.params.id)
		const user = await this.userModel.getOne(userId)

		const userActivationUUID = await userActivationUUIDModel.getOne(userId)

		console.log(userId, user)
		if (userActivationUUIDModel.isInstance(userActivationUUID) && this.userModel.isInstance(user)){
			if(userActivationUUID.user_id == userId && userActivationUUID.uuid == req.params.uuid) {
				await this.userModel.updateWhere({'id': userId}, {is_verified : true})
				res.statusCode = 200
				return res.json(this.success({}))
			}
		}
		return res.status(410).json(this.error('Page no more available'))
	}

	private generateCookie(userId: number) {

	}


}



