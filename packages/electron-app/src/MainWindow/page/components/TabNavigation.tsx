import { h, ComponentChildren, VNode, Fragment } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import styled from 'styled-components';

import Button from './Button';

type Props = {
  children: Array<VNode<ChildWrapperProps>>;
};
const TabNavigation = ({ children }: Props): JSX.Element => {
  const tabs = useMemo(() => children.map(({ props: { tabId, name } }) => ({ tabId, name })), [children]);
  const [activeId, setActiveId] = useState(tabs[0]?.tabId);
  const ActiveChild = useMemo(() => children.find(({ props: { tabId } }) => tabId === activeId), [activeId, children]);

  return (
    <Container>
      {tabs.map(({ tabId, name }) => (
        <Tab
          isActive={tabId === activeId}
          onClick={() => setActiveId(tabId)}
        >
          {name}
        </Tab>
      ))}
      {ActiveChild}
    </Container>
  );
};

type ChildWrapperProps = {
  tabId: string;
  name: string;
  children: ComponentChildren;
};
const ChildWrapper = ({ children }: ChildWrapperProps): VNode<ChildWrapperProps> => <Fragment>{children}</Fragment>;

const Container = styled.div`
  width: 100%;
`;

type TabProps = {
  isActive?: boolean;
};
const Tab = styled(Button)<TabProps>`
  ${({ isActive }) => isActive && 'border-width: 2px;'}
  margin-right: 10px;
`;

export { ChildWrapper as Tab };
export default TabNavigation;
