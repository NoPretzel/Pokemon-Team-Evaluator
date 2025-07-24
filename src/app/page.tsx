import { Container, Title, Text, Center } from '@mantine/core';

export default function Home() {
  return (
    <Container size="lg" py="xl">
      <Center>
        <div>
          <Title order={1} ta="center" mb="md">
            Pokemon Team Evaluator
          </Title>
          <Text ta="center" c="dimmed">
            Evaluate and optimize your Pokemon Showdown teams
          </Text>
        </div>
      </Center>
    </Container>
  );
}