import { h } from 'preact';
import { useCallback } from 'preact/hooks';
import styled from 'styled-components';

import { TClub } from '../../../typings/clubs';
import Button from './Button';

type TProps = {
  className?: string;
  clubs: TClub[];
  onClubClick: (club: TClub) => void;
};

const ClubSelect = ({ className, onClubClick, clubs }: TProps): JSX.Element => {
  const getClubClickHandler = useCallback((club: TClub) => () => {
    onClubClick(club);
  }, [onClubClick]);

  return (
    <Container className={className}>
      <Heading>Выберите клуб</Heading>
      <Clubs>
        {clubs.map((club) => {
          const { id, name } = club;
          return (
            <li key={id}>
              <Club onClick={getClubClickHandler(club)}>{name}</Club>
            </li>
          );
        })}
      </Clubs>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
`;

const Heading = styled.h3`
  text-align: center;
  margin-top: 0;
`;

const Clubs = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;

  & > li {
    &:not(:last-child) {
      margin-bottom: 5px;
    }
  }
`;

const Club = styled(Button)`
  width: 100%;
`;

export default ClubSelect;
