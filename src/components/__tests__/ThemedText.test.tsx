import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemedText } from '../ThemedText';
import { ThemeProvider } from '@/theme/ThemeProvider';

type FlatStyle = { color?: string; fontWeight?: string; fontSize?: number };

type RenderHandle = {
  getByText: (text: string) => Promise<unknown>;
  getByTestId: (id: string) => Promise<unknown>;
};

type TextLikeNode = { props: { style: unknown } };

/** In this RTL version `render(...)` itself is a thenable: await it. */
async function renderTree(ui: React.ReactElement): Promise<RenderHandle> {
  const handle = (await (render as unknown as (ui: React.ReactElement) => Promise<RenderHandle>)(
    <ThemeProvider>{ui}</ThemeProvider>
  )) as unknown as RenderHandle;
  return handle;
}

/** First style entry of the flattened array returned by StyleSheet.flatten. */
function firstStyle(node: { props: { style: unknown } }): FlatStyle {
  const s = node.props.style;
  const flat = Array.isArray(s) ? (s[0] as FlatStyle) : (s as FlatStyle);
  return flat ?? {};
}

describe('ThemedText', () => {
  test('renders children with default variant', async () => {
    const handle = await renderTree(<ThemedText variant="body">Hello</ThemedText>);
    expect(await handle.getByText('Hello')).toBeTruthy();
  });

  test('applies secondary color variant', async () => {
    const handle = await renderTree(<ThemedText color="secondary">sub</ThemedText>);
    const node = (await handle.getByText('sub')) as unknown as TextLikeNode;
    expect(firstStyle(node).color).toBe('#77716E');
  });

  test('applies primary color variant', async () => {
    const handle = await renderTree(<ThemedText color="primary">main</ThemedText>);
    const node = (await handle.getByText('main')) as unknown as TextLikeNode;
    expect(firstStyle(node).color).toBe('#762536');
  });

  test('bold weight maps to 700', async () => {
    const handle = await renderTree(<ThemedText weight="bold">b</ThemedText>);
    const node = (await handle.getByText('b')) as unknown as TextLikeNode;
    expect(firstStyle(node).fontWeight).toBe('700');
  });

  test('medium weight maps to 600', async () => {
    const handle = await renderTree(<ThemedText weight="medium">m</ThemedText>);
    const node = (await handle.getByText('m')) as unknown as TextLikeNode;
    expect(firstStyle(node).fontWeight).toBe('600');
  });

  test('regular weight maps to 400', async () => {
    const handle = await renderTree(<ThemedText weight="regular">r</ThemedText>);
    const node = (await handle.getByText('r')) as unknown as TextLikeNode;
    expect(firstStyle(node).fontWeight).toBe('400');
  });

  test('font scale multiplies size (accessibility: scalable text)', async () => {
    const handle = await renderTree(
      <ThemedText variant="body" testID="scale-test">
        resize
      </ThemedText>
    );
    const node = (await handle.getByTestId('scale-test')) as unknown as TextLikeNode;
    expect(firstStyle(node).fontSize).toBe(15);
  });
});
