import React, { Component } from 'react';
import { connect } from 'react-redux';
import logo from '../img/logo.png';
import Menu from './Menu';
import FBLoginButton from './FBLoginButton';
import PublicGameList from './PublicGameList';

class Home extends Component {

    render() {
        return (
            <div>
                <img src={logo} alt="DOT CONNECT" />
                <p className="subtitle has-text-grey">
                    Play your favorite childhood game online with friends
                </p>
                 <div className="subtitle has-text-grey">
                    Hello, {this.props.user.name}
                    <br/>
                    <FBLoginButton />
                </div>

                <Menu
                    gameStatus={this.props.gameStatus}
                    gameId={this.props.gameId}
                />
                <PublicGameList games={this.props.availableGames} />
            </div>
        );
    }
}

const mapStateToProps = state => ({
    gameStatus: state.gameStatus,
    gameId: state.gameId,
    availableGames: state.availableGames,
    user: state.user,
});

export default connect(mapStateToProps)(Home);