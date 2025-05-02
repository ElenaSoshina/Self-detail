import React from 'react';
import styles from './QuestionButton.module.css';

interface QuestionButtonProps {
  onClick?: () => void;
}

const QuestionButton: React.FC<QuestionButtonProps> = ({ onClick }) => {
  return (
    <button className={styles.questionButton} onClick={onClick}>
      <span className={styles.buttonIcon}>💬</span>
      Задать вопрос
    </button>
  );
};

export default QuestionButton; 