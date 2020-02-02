import React from 'react'
import SingIn from './components/auth/SignIn'
import SingUp from './components/auth/SignUp'
import ProfileComponent from './components/profile/Profile'
import PrivateRoute from './helpers/PrivateRoute'
import GuestRoute from './helpers/GuestRoute'

import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import PrimaryAppBar from './components/layout/PrimaryAppBar'

export default function App() {
	return (
		<React.Fragment>
			<Router>
				<PrimaryAppBar />

				<Switch>
					{/* <Route path='/' exact component={} /> */}
					<GuestRoute path='/login' component={SingIn} />
					<GuestRoute path='/register' component={SingUp} />
					<PrivateRoute path='/profile' component={ProfileComponent} />
					<Route path='*'>
						<NoMatch />
					</Route>
				</Switch>
			</Router>
		</React.Fragment>
	)
}

function NoMatch() {
	return <div>ERROR 404</div>
}