import React from 'react';
import './Gallery.css';

function Gallery() {
  return (
    <section className="gallery">
      <div className="gallery-grid">
        {/* Замените эти изображения на свои */}
        <img src="/assets/gallery/img1.jpg" alt="Project 1" />
        <img src="/assets/gallery/img2.jpg" alt="Project 2" />
        <img src="/assets/gallery/img3.jpg" alt="Project 3" />
        <img src="/assets/gallery/img4.jpg" alt="Project 4" />
      </div>
    </section>
  );
}

export default Gallery;
