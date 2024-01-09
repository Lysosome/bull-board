import * as bullBoard from '@lysosome/bull-board-api';

describe('lib public interface', () => {
  it('should save the interface', () => {
    expect(bullBoard).toMatchInlineSnapshot(`
      {
        "createBullBoard": [Function],
      }
    `);
  });
});
