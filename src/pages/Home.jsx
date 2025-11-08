/**
 * @file Home.jsx
 * @description Homepage with news, events, and team updates
 * @module pages/Home
 */

import React from 'react';

/**
 * Home component - displays landing page content
 * 
 * @component
 * @description Homepage with two-column layout featuring:
 * - Latest news and announcements
 * - Upcoming events calendar
 * - Team updates and match reports
 * - Community engagement information
 * - Rugby action images
 * 
 * @example
 * <Route path="/" element={<Home />} />
 * 
 * @returns {JSX.Element} Homepage with news and updates
 */
function Home() {
  return (
    <div className="page-content">
      <h2 className="page-header-title">Welcome to Devon RFU Colts</h2>
      
      <div className="two-column-layout">
        <div className="column">
          <h3>Latest News</h3>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
            fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
            culpa qui officia deserunt mollit anim id est laborum.
          </p>
          
          <img 
            src="/slideshow/image_01.png" 
            alt="Devon RFU Colts action" 
            className="content-image"
          />
          
          <h3>Upcoming Events</h3>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque 
            laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi 
            architecto beatae vitae dicta sunt explicabo.
          </p>
          <p>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia 
            consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
          </p>
        </div>
        
        <div className="column">
          <h3>Team Updates</h3>
          <p>
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium 
            voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint 
            occaecati cupiditate non provident.
          </p>
          
          <img 
            src="/slideshow/image_05.png" 
            alt="Colts team celebration" 
            className="content-image"
          />
          
          <p>
            Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum 
            fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, 
            cum soluta nobis est eligendi optio cumque nihil impedit quo minus.
          </p>
          
          <h3>Get Involved</h3>
          <p>
            Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe 
            eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum 
            rerum hic tenetur a sapiente delectus.
          </p>
          <p>
            Ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus 
            asperiores repellat. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do 
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
