/**
 * @file About.jsx
 * @description About page with organization history and mission
 * @module pages/About
 */

import React from 'react';

/**
 * About component - displays organizational information
 * 
 * @component
 * @description About page with two-column layout featuring:
 * - Organization history and heritage
 * - Mission statement and goals
 * - Youth development programs
 * - Community values and engagement
 * - Historical team images
 * 
 * @example
 * <Route path="/about" element={<About />} />
 * 
 * @returns {JSX.Element} About page with organizational information
 */
function About() {
  return (
    <div className="page-content">
      <h2 className="page-header-title">About Devon RFU Colts</h2>
      
      <div className="two-column-layout">
        <div className="column">
          <h3>Our History</h3>
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
            src="/slideshow/image_03.png" 
            alt="Devon RFU Colts team" 
            className="content-image"
          />
          
          <h3>Our Mission</h3>
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
          <h3>Youth Development</h3>
          <p>
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium 
            voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint 
            occaecati cupiditate non provident.
          </p>
          
          <img 
            src="/slideshow/image_07.png" 
            alt="Youth rugby training" 
            className="content-image"
          />
          
          <p>
            Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum 
            fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, 
            cum soluta nobis est eligendi optio cumque nihil impedit quo minus.
          </p>
          
          <h3>Community & Values</h3>
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

export default About;
