import { Button } from '@material-ui/core'
import React from 'react'
import { useHistory } from 'react-router-dom'
import "../styles/Banner.css"

function Banner() {
    const history = useHistory()

    const cropRedirect = () => {
        history.push("/crop")
    }

    const fertRedirect = () => {
        history.push("/fertilizer")
    }

    return (
        <div className="banner">
            <div className="banner__title">
                <div className="banner__title_head">
                    CropWise <span className="highlight">AI</span>
                </div>

                <div className="banner__title_tail">
                    <div className="typing">
                        A machine learning based web application for crop and fertilizer recommendation
                    </div>

                    <div className="banner__buttons">
                        <Button onClick={cropRedirect} className="banner__button">
                            Crop Recommender
                        </Button>
                        <Button onClick={fertRedirect} className="banner__button">
                            Fertilizer Recommender
                        </Button>
                    </div>

                    <div className="banner__socialMedia">
                        <a
                            className="social_icon_linkedin"
                            href="https://www.linkedin.com/in/abhijeet-gupta-b51bb224a/"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abhijeet LinkedIn"
                        >
                            <i className="fa fa-linkedin"></i>
                        </a>

                        <a
                            className="social_icon_github"
                            href="https://github.com/AbhijeetGupta2005"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abhijeet GitHub"
                        >
                            <i className="fa fa-github"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Banner
