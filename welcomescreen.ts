import React from ‘react’;

interface WelcomeScreenProps {
onStart?: () => void;
companyName?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
onStart,
companyName = “Jay’s Frames”
}) => {
return (
<div className="welcome-screen">
<div className="welcome-content">
<h1>Welcome to {companyName}</h1>
<p>
We're here to help you with all your custom framing needs.
Our expert team specializes in museum-quality preservation and
beautiful custom frames for your artwork, photos, and memorabilia.
</p>
<div className="services">
<h2>Our Services Include:</h2>
<ul>
<li>Custom picture framing</li>
<li>Museum-quality preservation</li>
<li>Professional matting</li>
<li>UV protection glass</li>
<li>Sports memorabilia framing</li>
<li>Certificate and diploma framing</li>
</ul>
</div>
<div className="contact-info">
<h3>Visit Our Houston Location</h3>
<p>218 W. 27th Street, Houston, TX 77008</p>
<p>Phone: (832) 893-3794</p>
<p>Hours: Mon-Fri 10am-6pm, Sat 11am-5pm, Sun Closed</p>
</div>
{onStart && (
<button onClick={onStart} className="start-button">
Start Conversation
</button>
)}
</div>
</div>
);
};

export default WelcomeScreen;
